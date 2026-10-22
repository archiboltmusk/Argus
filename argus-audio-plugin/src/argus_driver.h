#ifndef ARGUS_DRIVER_H
#define ARGUS_DRIVER_H

#include <CoreAudio/AudioServerPlugIn.h>
#include <CoreFoundation/CoreFoundation.h>
#include <mach/mach_time.h>
#include <pthread.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>

#ifndef kAudioObjectPropertyElementMain
#define kAudioObjectPropertyElementMain kAudioObjectPropertyElementMaster
#endif

#define kArgusPlugInObjectID ((AudioObjectID)kAudioObjectPlugInObject)
#define kArgusDeviceObjectID ((AudioObjectID)2)
#define kArgusInputStreamID ((AudioObjectID)3)
#define kArgusOutputStreamID ((AudioObjectID)4)

#define kArgusChannels ((UInt32)2)
#define kArgusBitsPerChannel ((UInt32)32)
#define kArgusBytesPerFrame ((UInt32)(kArgusChannels * sizeof(Float32)))
#define kArgusRingFrames ((UInt32)16384)
#define kArgusRingSamples ((UInt32)(kArgusRingFrames * kArgusChannels))

#define kArgusDeviceName CFSTR("Argus Virtual Mic")
#define kArgusInputStreamName CFSTR("Argus Virtual Mic Input")
#define kArgusOutputStreamName CFSTR("Argus Virtual Mic Output")
#define kArgusManufacturer CFSTR("Argus")
#define kArgusModelName CFSTR("Argus Virtual Audio Cable")
#define kArgusDeviceUID CFSTR("ArgusVirtualMic:0")
#define kArgusModelUID CFSTR("ArgusVirtualMic:Model")
#define kArgusBundleID CFSTR("com.argus.audio.virtualmic")

typedef struct {
    pthread_mutex_t lock;
    pthread_mutex_t ioLock;
    UInt32 refCount;
    AudioServerPlugInHostRef host;
    Float64 sampleRate;
    UInt32 ioRunning;
    bool inputActive;
    bool outputActive;
    Float64 hostTicksPerFrame;
    Float64 anchorSampleTime;
    UInt64 anchorHostTime;
    UInt64 timelineSeed;
    Float32 *ring;
} ArgusDriverState;

extern ArgusDriverState gArgus;

const Float64 *argus_rates(UInt32 *outCount);
bool argus_rate_supported(Float64 rate);
void argus_fill_format(AudioStreamBasicDescription *outFormat, Float64 rate);
Float64 argus_host_ticks_per_frame(Float64 rate);
UInt32 argus_streams_in_scope(AudioObjectPropertyScope scope, AudioObjectID *outStreams);
OSStatus argus_request_rate(Float64 rate);

Boolean argus_plugin_has(const AudioObjectPropertyAddress *address);
OSStatus argus_plugin_settable(const AudioObjectPropertyAddress *address, Boolean *outSettable);
OSStatus argus_plugin_size(const AudioObjectPropertyAddress *address, UInt32 *outSize);
OSStatus argus_plugin_get(const AudioObjectPropertyAddress *address, UInt32 qualifierSize,
                           const void *qualifier, UInt32 dataSize, UInt32 *outSize, void *outData);

Boolean argus_device_has(const AudioObjectPropertyAddress *address);
OSStatus argus_device_settable(const AudioObjectPropertyAddress *address, Boolean *outSettable);
OSStatus argus_device_size(const AudioObjectPropertyAddress *address, UInt32 *outSize);
OSStatus argus_device_get(const AudioObjectPropertyAddress *address, UInt32 dataSize,
                           UInt32 *outSize, void *outData);
OSStatus argus_device_set(const AudioObjectPropertyAddress *address, UInt32 dataSize,
                           const void *data);

Boolean argus_stream_has(AudioObjectID stream, const AudioObjectPropertyAddress *address);
OSStatus argus_stream_settable(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                                Boolean *outSettable);
OSStatus argus_stream_size(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                            UInt32 *outSize);
OSStatus argus_stream_get(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                           UInt32 dataSize, UInt32 *outSize, void *outData);
OSStatus argus_stream_set(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                           UInt32 dataSize, const void *data);

OSStatus argus_start_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client);
OSStatus argus_stop_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client);
OSStatus argus_zero_timestamp(AudioServerPlugInDriverRef driver, AudioObjectID device,
                               UInt32 client, Float64 *outSampleTime, UInt64 *outHostTime,
                               UInt64 *outSeed);
OSStatus argus_will_do_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                           UInt32 operation, Boolean *outWillDo, Boolean *outWillDoInPlace);
OSStatus argus_begin_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                         UInt32 operation, UInt32 frames, const AudioServerPlugInIOCycleInfo *cycle);
OSStatus argus_do_io(AudioServerPlugInDriverRef driver, AudioObjectID device, AudioObjectID stream,
                      UInt32 client, UInt32 operation, UInt32 frames,
                      const AudioServerPlugInIOCycleInfo *cycle, void *mainBuffer,
                      void *secondaryBuffer);
OSStatus argus_end_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                       UInt32 operation, UInt32 frames, const AudioServerPlugInIOCycleInfo *cycle);
void argus_silence_ring(void);

#endif
