#include "argus_driver.h"

static UInt32 argus_ring_offset(Float64 sampleTime)
{
    SInt64 frame = (SInt64)sampleTime;
    SInt64 wrapped = frame % (SInt64)kArgusRingFrames;
    if (wrapped < 0) {
        wrapped += (SInt64)kArgusRingFrames;
    }
    return (UInt32)wrapped;
}

static void argus_ring_write(const Float32 *source, UInt32 offset, UInt32 frames)
{
    UInt32 head = kArgusRingFrames - offset;
    if (head > frames) {
        head = frames;
    }
    memcpy(gArgus.ring + (size_t)offset * kArgusChannels, source,
           (size_t)head * kArgusBytesPerFrame);
    UInt32 tail = frames - head;
    if (tail > 0) {
        memcpy(gArgus.ring, source + (size_t)head * kArgusChannels,
               (size_t)tail * kArgusBytesPerFrame);
    }
}

static void argus_ring_read(Float32 *destination, UInt32 offset, UInt32 frames)
{
    UInt32 head = kArgusRingFrames - offset;
    if (head > frames) {
        head = frames;
    }
    memcpy(destination, gArgus.ring + (size_t)offset * kArgusChannels,
           (size_t)head * kArgusBytesPerFrame);
    UInt32 tail = frames - head;
    if (tail > 0) {
        memcpy(destination + (size_t)head * kArgusChannels, gArgus.ring,
               (size_t)tail * kArgusBytesPerFrame);
    }
}

OSStatus argus_start_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client)
{
    (void)driver;
    (void)client;
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    pthread_mutex_lock(&gArgus.lock);
    Float64 rate = gArgus.sampleRate;
    pthread_mutex_unlock(&gArgus.lock);

    pthread_mutex_lock(&gArgus.ioLock);
    bool first = gArgus.ioRunning == 0;
    if (first) {
        gArgus.hostTicksPerFrame = argus_host_ticks_per_frame(rate);
        gArgus.anchorSampleTime = 0.0;
        gArgus.anchorHostTime = mach_absolute_time();
        gArgus.timelineSeed += 1;
    }
    gArgus.ioRunning += 1;
    pthread_mutex_unlock(&gArgus.ioLock);

    if (first) {
        argus_silence_ring();
    }
    return kAudioHardwareNoError;
}

OSStatus argus_stop_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client)
{
    (void)driver;
    (void)client;
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    pthread_mutex_lock(&gArgus.ioLock);
    if (gArgus.ioRunning > 0) {
        gArgus.ioRunning -= 1;
    }
    bool last = gArgus.ioRunning == 0;
    pthread_mutex_unlock(&gArgus.ioLock);
    if (last) {
        argus_silence_ring();
    }
    return kAudioHardwareNoError;
}

OSStatus argus_zero_timestamp(AudioServerPlugInDriverRef driver, AudioObjectID device,
                               UInt32 client, Float64 *outSampleTime, UInt64 *outHostTime,
                               UInt64 *outSeed)
{
    (void)driver;
    (void)client;
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    if (outSampleTime == NULL || outHostTime == NULL || outSeed == NULL) {
        return kAudioHardwareIllegalOperationError;
    }

    pthread_mutex_lock(&gArgus.ioLock);
    Float64 ticksPerRing = gArgus.hostTicksPerFrame * (Float64)kArgusRingFrames;
    UInt64 now = mach_absolute_time();
    if (ticksPerRing > 0.0 && now > gArgus.anchorHostTime) {
        Float64 elapsed = (Float64)(now - gArgus.anchorHostTime);
        if (elapsed >= ticksPerRing) {
            Float64 periods = (Float64)(UInt64)(elapsed / ticksPerRing);
            gArgus.anchorSampleTime += periods * (Float64)kArgusRingFrames;
            gArgus.anchorHostTime += (UInt64)(periods * ticksPerRing);
        }
    }
    *outSampleTime = gArgus.anchorSampleTime;
    *outHostTime = gArgus.anchorHostTime;
    *outSeed = gArgus.timelineSeed;
    pthread_mutex_unlock(&gArgus.ioLock);
    return kAudioHardwareNoError;
}

OSStatus argus_will_do_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                           UInt32 operation, Boolean *outWillDo, Boolean *outWillDoInPlace)
{
    (void)driver;
    (void)client;
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    if (outWillDo == NULL || outWillDoInPlace == NULL) {
        return kAudioHardwareIllegalOperationError;
    }
    Boolean handled = operation == kAudioServerPlugInIOOperationReadInput ||
                      operation == kAudioServerPlugInIOOperationWriteMix;
    *outWillDo = handled;
    *outWillDoInPlace = true;
    return kAudioHardwareNoError;
}

OSStatus argus_begin_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                         UInt32 operation, UInt32 frames, const AudioServerPlugInIOCycleInfo *cycle)
{
    (void)driver;
    (void)client;
    (void)operation;
    (void)frames;
    (void)cycle;
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    return kAudioHardwareNoError;
}

OSStatus argus_do_io(AudioServerPlugInDriverRef driver, AudioObjectID device, AudioObjectID stream,
                      UInt32 client, UInt32 operation, UInt32 frames,
                      const AudioServerPlugInIOCycleInfo *cycle, void *mainBuffer,
                      void *secondaryBuffer)
{
    (void)driver;
    (void)stream;
    (void)client;
    (void)secondaryBuffer;
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    if (mainBuffer == NULL || cycle == NULL || frames == 0) {
        return kAudioHardwareNoError;
    }
    if (frames > kArgusRingFrames) {
        frames = kArgusRingFrames;
    }

    if (operation == kAudioServerPlugInIOOperationWriteMix) {
        argus_ring_write((const Float32 *)mainBuffer,
                          argus_ring_offset(cycle->mOutputTime.mSampleTime), frames);
        return kAudioHardwareNoError;
    }

    if (operation == kAudioServerPlugInIOOperationReadInput) {
        argus_ring_read((Float32 *)mainBuffer,
                         argus_ring_offset(cycle->mInputTime.mSampleTime), frames);
        return kAudioHardwareNoError;
    }

    return kAudioHardwareNoError;
}

OSStatus argus_end_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                       UInt32 operation, UInt32 frames, const AudioServerPlugInIOCycleInfo *cycle)
{
    (void)driver;
    (void)client;
    (void)operation;
    (void)frames;
    (void)cycle;
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    return kAudioHardwareNoError;
}
