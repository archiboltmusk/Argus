#include "argus_driver.h"

static bool argus_is_input(AudioObjectID stream)
{
    return stream == kArgusInputStreamID;
}

Boolean argus_stream_has(AudioObjectID stream, const AudioObjectPropertyAddress *address)
{
    (void)stream;
    switch (address->mSelector) {
    case kAudioObjectPropertyBaseClass:
    case kAudioObjectPropertyClass:
    case kAudioObjectPropertyOwner:
    case kAudioObjectPropertyName:
    case kAudioObjectPropertyCustomPropertyInfoList:
    case kAudioStreamPropertyIsActive:
    case kAudioStreamPropertyDirection:
    case kAudioStreamPropertyTerminalType:
    case kAudioStreamPropertyStartingChannel:
    case kAudioStreamPropertyLatency:
    case kAudioStreamPropertyVirtualFormat:
    case kAudioStreamPropertyPhysicalFormat:
    case kAudioStreamPropertyAvailableVirtualFormats:
    case kAudioStreamPropertyAvailablePhysicalFormats:
        return true;
    default:
        return false;
    }
}

OSStatus argus_stream_settable(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                                Boolean *outSettable)
{
    if (!argus_stream_has(stream, address)) {
        return kAudioHardwareUnknownPropertyError;
    }
    switch (address->mSelector) {
    case kAudioStreamPropertyIsActive:
    case kAudioStreamPropertyVirtualFormat:
    case kAudioStreamPropertyPhysicalFormat:
        *outSettable = true;
        return kAudioHardwareNoError;
    default:
        *outSettable = false;
        return kAudioHardwareNoError;
    }
}

OSStatus argus_stream_size(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                            UInt32 *outSize)
{
    (void)stream;
    UInt32 rateCount = 0;
    argus_rates(&rateCount);

    switch (address->mSelector) {
    case kAudioObjectPropertyBaseClass:
    case kAudioObjectPropertyClass:
        *outSize = sizeof(AudioClassID);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyOwner:
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyName:
        *outSize = sizeof(CFStringRef);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyCustomPropertyInfoList:
        *outSize = 0;
        return kAudioHardwareNoError;
    case kAudioStreamPropertyIsActive:
    case kAudioStreamPropertyDirection:
    case kAudioStreamPropertyTerminalType:
    case kAudioStreamPropertyStartingChannel:
    case kAudioStreamPropertyLatency:
        *outSize = sizeof(UInt32);
        return kAudioHardwareNoError;
    case kAudioStreamPropertyVirtualFormat:
    case kAudioStreamPropertyPhysicalFormat:
        *outSize = sizeof(AudioStreamBasicDescription);
        return kAudioHardwareNoError;
    case kAudioStreamPropertyAvailableVirtualFormats:
    case kAudioStreamPropertyAvailablePhysicalFormats:
        *outSize = rateCount * (UInt32)sizeof(AudioStreamRangedDescription);
        return kAudioHardwareNoError;
    default:
        return kAudioHardwareUnknownPropertyError;
    }
}

static OSStatus argus_stream_u32(UInt32 value, UInt32 dataSize, UInt32 *outSize, void *outData)
{
    if (dataSize < sizeof(UInt32)) {
        return kAudioHardwareBadPropertySizeError;
    }
    *((UInt32 *)outData) = value;
    *outSize = sizeof(UInt32);
    return kAudioHardwareNoError;
}

static OSStatus argus_stream_formats(UInt32 dataSize, UInt32 *outSize, void *outData)
{
    UInt32 count = 0;
    const Float64 *rates = argus_rates(&count);
    UInt32 room = dataSize / (UInt32)sizeof(AudioStreamRangedDescription);
    UInt32 written = room < count ? room : count;
    AudioStreamRangedDescription *entries = (AudioStreamRangedDescription *)outData;
    for (UInt32 index = 0; index < written; index += 1) {
        argus_fill_format(&entries[index].mFormat, rates[index]);
        entries[index].mSampleRateRange.mMinimum = rates[index];
        entries[index].mSampleRateRange.mMaximum = rates[index];
    }
    *outSize = written * (UInt32)sizeof(AudioStreamRangedDescription);
    return kAudioHardwareNoError;
}

OSStatus argus_stream_get(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                           UInt32 dataSize, UInt32 *outSize, void *outData)
{
    bool input = argus_is_input(stream);

    switch (address->mSelector) {
    case kAudioObjectPropertyBaseClass:
        if (dataSize < sizeof(AudioClassID)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((AudioClassID *)outData) = kAudioObjectClassID;
        *outSize = sizeof(AudioClassID);
        return kAudioHardwareNoError;

    case kAudioObjectPropertyClass:
        if (dataSize < sizeof(AudioClassID)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((AudioClassID *)outData) = kAudioStreamClassID;
        *outSize = sizeof(AudioClassID);
        return kAudioHardwareNoError;

    case kAudioObjectPropertyOwner:
        if (dataSize < sizeof(AudioObjectID)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((AudioObjectID *)outData) = kArgusDeviceObjectID;
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;

    case kAudioObjectPropertyName:
        if (dataSize < sizeof(CFStringRef)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((CFStringRef *)outData) =
            CFStringCreateCopy(NULL, input ? kArgusInputStreamName : kArgusOutputStreamName);
        *outSize = sizeof(CFStringRef);
        return kAudioHardwareNoError;

    case kAudioObjectPropertyCustomPropertyInfoList:
        *outSize = 0;
        return kAudioHardwareNoError;

    case kAudioStreamPropertyIsActive: {
        pthread_mutex_lock(&gArgus.lock);
        UInt32 active = (input ? gArgus.inputActive : gArgus.outputActive) ? 1 : 0;
        pthread_mutex_unlock(&gArgus.lock);
        return argus_stream_u32(active, dataSize, outSize, outData);
    }

    case kAudioStreamPropertyDirection:
        return argus_stream_u32(input ? 1 : 0, dataSize, outSize, outData);

    case kAudioStreamPropertyTerminalType:
        return argus_stream_u32(input ? kAudioStreamTerminalTypeMicrophone
                                       : kAudioStreamTerminalTypeSpeaker,
                                 dataSize, outSize, outData);

    case kAudioStreamPropertyStartingChannel:
        return argus_stream_u32(1, dataSize, outSize, outData);

    case kAudioStreamPropertyLatency:
        return argus_stream_u32(0, dataSize, outSize, outData);

    case kAudioStreamPropertyVirtualFormat:
    case kAudioStreamPropertyPhysicalFormat: {
        if (dataSize < sizeof(AudioStreamBasicDescription)) {
            return kAudioHardwareBadPropertySizeError;
        }
        pthread_mutex_lock(&gArgus.lock);
        Float64 rate = gArgus.sampleRate;
        pthread_mutex_unlock(&gArgus.lock);
        argus_fill_format((AudioStreamBasicDescription *)outData, rate);
        *outSize = sizeof(AudioStreamBasicDescription);
        return kAudioHardwareNoError;
    }

    case kAudioStreamPropertyAvailableVirtualFormats:
    case kAudioStreamPropertyAvailablePhysicalFormats:
        return argus_stream_formats(dataSize, outSize, outData);

    default:
        return kAudioHardwareUnknownPropertyError;
    }
}

static OSStatus argus_stream_set_active(AudioObjectID stream, UInt32 dataSize, const void *data)
{
    if (dataSize != sizeof(UInt32)) {
        return kAudioHardwareBadPropertySizeError;
    }
    bool wanted = *((const UInt32 *)data) != 0;
    bool input = argus_is_input(stream);
    pthread_mutex_lock(&gArgus.lock);
    bool changed = (input ? gArgus.inputActive : gArgus.outputActive) != wanted;
    if (input) {
        gArgus.inputActive = wanted;
    } else {
        gArgus.outputActive = wanted;
    }
    AudioServerPlugInHostRef host = gArgus.host;
    pthread_mutex_unlock(&gArgus.lock);
    if (changed && host != NULL) {
        AudioObjectPropertyAddress changedAddress = {kAudioStreamPropertyIsActive,
                                                     kAudioObjectPropertyScopeGlobal,
                                                     kAudioObjectPropertyElementMain};
        host->PropertiesChanged(host, stream, 1, &changedAddress);
    }
    return kAudioHardwareNoError;
}

static OSStatus argus_stream_set_format(UInt32 dataSize, const void *data)
{
    if (dataSize != sizeof(AudioStreamBasicDescription)) {
        return kAudioHardwareBadPropertySizeError;
    }
    const AudioStreamBasicDescription *wanted = (const AudioStreamBasicDescription *)data;
    if (wanted->mFormatID != kAudioFormatLinearPCM) {
        return kAudioHardwareUnsupportedOperationError;
    }
    if ((wanted->mFormatFlags & kAudioFormatFlagIsFloat) == 0) {
        return kAudioHardwareUnsupportedOperationError;
    }
    if ((wanted->mFormatFlags & kAudioFormatFlagIsNonInterleaved) != 0) {
        return kAudioHardwareUnsupportedOperationError;
    }
    if (wanted->mBitsPerChannel != kArgusBitsPerChannel) {
        return kAudioHardwareUnsupportedOperationError;
    }
    if (wanted->mChannelsPerFrame != kArgusChannels) {
        return kAudioHardwareUnsupportedOperationError;
    }
    if (!argus_rate_supported(wanted->mSampleRate)) {
        return kAudioHardwareUnsupportedOperationError;
    }
    return argus_request_rate(wanted->mSampleRate);
}

OSStatus argus_stream_set(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                           UInt32 dataSize, const void *data)
{
    switch (address->mSelector) {
    case kAudioStreamPropertyIsActive:
        return argus_stream_set_active(stream, dataSize, data);
    case kAudioStreamPropertyVirtualFormat:
    case kAudioStreamPropertyPhysicalFormat:
        return argus_stream_set_format(dataSize, data);
    default:
        if (argus_stream_has(stream, address)) {
            return kAudioHardwareUnsupportedOperationError;
        }
        return kAudioHardwareUnknownPropertyError;
    }
}
