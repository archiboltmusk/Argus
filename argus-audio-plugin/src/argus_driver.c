#include "argus_driver.h"

static Float32 gArgusRingStorage[kArgusRingSamples];

ArgusDriverState gArgus = {
    .lock = PTHREAD_MUTEX_INITIALIZER,
    .ioLock = PTHREAD_MUTEX_INITIALIZER,
    .refCount = 1,
    .host = NULL,
    .sampleRate = 48000.0,
    .ioRunning = 0,
    .inputActive = true,
    .outputActive = true,
    .hostTicksPerFrame = 0.0,
    .anchorSampleTime = 0.0,
    .anchorHostTime = 0,
    .timelineSeed = 1,
    .ring = gArgusRingStorage,
};

static HRESULT argus_query_interface(void *driver, REFIID uuid, LPVOID *outInterface);
static ULONG argus_add_ref(void *driver);
static ULONG argus_release(void *driver);
static OSStatus argus_initialize(AudioServerPlugInDriverRef driver, AudioServerPlugInHostRef host);
static OSStatus argus_create_device(AudioServerPlugInDriverRef driver, CFDictionaryRef description,
                                     const AudioServerPlugInClientInfo *client,
                                     AudioObjectID *outDevice);
static OSStatus argus_destroy_device(AudioServerPlugInDriverRef driver, AudioObjectID device);
static OSStatus argus_add_client(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                  const AudioServerPlugInClientInfo *client);
static OSStatus argus_remove_client(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                     const AudioServerPlugInClientInfo *client);
static OSStatus argus_perform_config_change(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                             UInt64 action, void *info);
static OSStatus argus_abort_config_change(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                           UInt64 action, void *info);
static Boolean argus_has_property(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                   pid_t client, const AudioObjectPropertyAddress *address);
static OSStatus argus_is_settable(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                   pid_t client, const AudioObjectPropertyAddress *address,
                                   Boolean *outSettable);
static OSStatus argus_get_size(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 *outSize);
static OSStatus argus_get_data(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 dataSize,
                                UInt32 *outSize, void *outData);
static OSStatus argus_set_data(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 dataSize,
                                const void *data);

static AudioServerPlugInDriverInterface gArgusInterface = {
    NULL,
    argus_query_interface,
    argus_add_ref,
    argus_release,
    argus_initialize,
    argus_create_device,
    argus_destroy_device,
    argus_add_client,
    argus_remove_client,
    argus_perform_config_change,
    argus_abort_config_change,
    argus_has_property,
    argus_is_settable,
    argus_get_size,
    argus_get_data,
    argus_set_data,
    argus_start_io,
    argus_stop_io,
    argus_zero_timestamp,
    argus_will_do_io,
    argus_begin_io,
    argus_do_io,
    argus_end_io,
};

static AudioServerPlugInDriverInterface *gArgusInterfacePtr = &gArgusInterface;
static AudioServerPlugInDriverRef gArgusDriverRef = &gArgusInterfacePtr;

void argus_silence_ring(void)
{
    memset(gArgusRingStorage, 0, sizeof(gArgusRingStorage));
}

static HRESULT argus_query_interface(void *driver, REFIID uuid, LPVOID *outInterface)
{
    if (driver != gArgusDriverRef || outInterface == NULL) {
        return (HRESULT)kAudioHardwareBadObjectError;
    }
    CFUUIDRef requested = CFUUIDCreateFromUUIDBytes(NULL, uuid);
    if (requested == NULL) {
        return (HRESULT)kAudioHardwareIllegalOperationError;
    }
    Boolean wanted = CFEqual(requested, IUnknownUUID) ||
                     CFEqual(requested, kAudioServerPlugInDriverInterfaceUUID);
    CFRelease(requested);
    if (!wanted) {
        return E_NOINTERFACE;
    }
    pthread_mutex_lock(&gArgus.lock);
    gArgus.refCount += 1;
    pthread_mutex_unlock(&gArgus.lock);
    *outInterface = gArgusDriverRef;
    return S_OK;
}

static ULONG argus_add_ref(void *driver)
{
    if (driver != gArgusDriverRef) {
        return 0;
    }
    pthread_mutex_lock(&gArgus.lock);
    if (gArgus.refCount < UINT32_MAX) {
        gArgus.refCount += 1;
    }
    ULONG count = gArgus.refCount;
    pthread_mutex_unlock(&gArgus.lock);
    return count;
}

static ULONG argus_release(void *driver)
{
    if (driver != gArgusDriverRef) {
        return 0;
    }
    pthread_mutex_lock(&gArgus.lock);
    if (gArgus.refCount > 0) {
        gArgus.refCount -= 1;
    }
    ULONG count = gArgus.refCount;
    pthread_mutex_unlock(&gArgus.lock);
    return count;
}

static OSStatus argus_initialize(AudioServerPlugInDriverRef driver, AudioServerPlugInHostRef host)
{
    if (driver != gArgusDriverRef) {
        return kAudioHardwareBadObjectError;
    }
    pthread_mutex_lock(&gArgus.lock);
    gArgus.host = host;
    Float64 rate = gArgus.sampleRate;
    pthread_mutex_unlock(&gArgus.lock);

    pthread_mutex_lock(&gArgus.ioLock);
    gArgus.hostTicksPerFrame = argus_host_ticks_per_frame(rate);
    pthread_mutex_unlock(&gArgus.ioLock);

    argus_silence_ring();
    return kAudioHardwareNoError;
}

static OSStatus argus_create_device(AudioServerPlugInDriverRef driver, CFDictionaryRef description,
                                     const AudioServerPlugInClientInfo *client,
                                     AudioObjectID *outDevice)
{
    (void)driver;
    (void)description;
    (void)client;
    (void)outDevice;
    return kAudioHardwareUnsupportedOperationError;
}

static OSStatus argus_destroy_device(AudioServerPlugInDriverRef driver, AudioObjectID device)
{
    (void)driver;
    (void)device;
    return kAudioHardwareUnsupportedOperationError;
}

static OSStatus argus_add_client(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                  const AudioServerPlugInClientInfo *client)
{
    (void)client;
    if (driver != gArgusDriverRef) {
        return kAudioHardwareBadObjectError;
    }
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    return kAudioHardwareNoError;
}

static OSStatus argus_remove_client(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                     const AudioServerPlugInClientInfo *client)
{
    (void)client;
    if (driver != gArgusDriverRef) {
        return kAudioHardwareBadObjectError;
    }
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    return kAudioHardwareNoError;
}

static OSStatus argus_perform_config_change(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                             UInt64 action, void *info)
{
    (void)info;
    if (driver != gArgusDriverRef) {
        return kAudioHardwareBadObjectError;
    }
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    Float64 rate = (Float64)action;
    if (!argus_rate_supported(rate)) {
        return kAudioHardwareIllegalOperationError;
    }
    pthread_mutex_lock(&gArgus.lock);
    gArgus.sampleRate = rate;
    pthread_mutex_unlock(&gArgus.lock);

    pthread_mutex_lock(&gArgus.ioLock);
    gArgus.hostTicksPerFrame = argus_host_ticks_per_frame(rate);
    gArgus.anchorSampleTime = 0.0;
    gArgus.anchorHostTime = mach_absolute_time();
    gArgus.timelineSeed += 1;
    pthread_mutex_unlock(&gArgus.ioLock);

    argus_silence_ring();
    return kAudioHardwareNoError;
}

static OSStatus argus_abort_config_change(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                           UInt64 action, void *info)
{
    (void)action;
    (void)info;
    if (driver != gArgusDriverRef) {
        return kAudioHardwareBadObjectError;
    }
    if (device != kArgusDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    return kAudioHardwareNoError;
}

static Boolean argus_has_property(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                   pid_t client, const AudioObjectPropertyAddress *address)
{
    (void)client;
    if (driver != gArgusDriverRef || address == NULL) {
        return false;
    }
    switch (object) {
    case kArgusPlugInObjectID:
        return argus_plugin_has(address);
    case kArgusDeviceObjectID:
        return argus_device_has(address);
    case kArgusInputStreamID:
    case kArgusOutputStreamID:
        return argus_stream_has(object, address);
    default:
        return false;
    }
}

static OSStatus argus_is_settable(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                   pid_t client, const AudioObjectPropertyAddress *address,
                                   Boolean *outSettable)
{
    (void)client;
    if (driver != gArgusDriverRef || address == NULL || outSettable == NULL) {
        return kAudioHardwareIllegalOperationError;
    }
    switch (object) {
    case kArgusPlugInObjectID:
        return argus_plugin_settable(address, outSettable);
    case kArgusDeviceObjectID:
        return argus_device_settable(address, outSettable);
    case kArgusInputStreamID:
    case kArgusOutputStreamID:
        return argus_stream_settable(object, address, outSettable);
    default:
        return kAudioHardwareBadObjectError;
    }
}

static OSStatus argus_get_size(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 *outSize)
{
    (void)client;
    (void)qualifierSize;
    (void)qualifier;
    if (driver != gArgusDriverRef || address == NULL || outSize == NULL) {
        return kAudioHardwareIllegalOperationError;
    }
    switch (object) {
    case kArgusPlugInObjectID:
        return argus_plugin_size(address, outSize);
    case kArgusDeviceObjectID:
        return argus_device_size(address, outSize);
    case kArgusInputStreamID:
    case kArgusOutputStreamID:
        return argus_stream_size(object, address, outSize);
    default:
        return kAudioHardwareBadObjectError;
    }
}

static OSStatus argus_get_data(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 dataSize,
                                UInt32 *outSize, void *outData)
{
    (void)client;
    if (driver != gArgusDriverRef || address == NULL || outSize == NULL || outData == NULL) {
        return kAudioHardwareIllegalOperationError;
    }
    switch (object) {
    case kArgusPlugInObjectID:
        return argus_plugin_get(address, qualifierSize, qualifier, dataSize, outSize, outData);
    case kArgusDeviceObjectID:
        return argus_device_get(address, dataSize, outSize, outData);
    case kArgusInputStreamID:
    case kArgusOutputStreamID:
        return argus_stream_get(object, address, dataSize, outSize, outData);
    default:
        return kAudioHardwareBadObjectError;
    }
}

static OSStatus argus_set_data(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 dataSize,
                                const void *data)
{
    (void)client;
    (void)qualifierSize;
    (void)qualifier;
    if (driver != gArgusDriverRef || address == NULL || data == NULL) {
        return kAudioHardwareIllegalOperationError;
    }
    switch (object) {
    case kArgusDeviceObjectID:
        return argus_device_set(address, dataSize, data);
    case kArgusInputStreamID:
    case kArgusOutputStreamID:
        return argus_stream_set(object, address, dataSize, data);
    case kArgusPlugInObjectID:
        return kAudioHardwareUnknownPropertyError;
    default:
        return kAudioHardwareBadObjectError;
    }
}

__attribute__((visibility("default"))) void *ArgusVirtualMicCreate(CFAllocatorRef allocator,
                                                                   CFUUIDRef requestedTypeUUID);

void *ArgusVirtualMicCreate(CFAllocatorRef allocator, CFUUIDRef requestedTypeUUID)
{
    (void)allocator;
    if (requestedTypeUUID == NULL) {
        return NULL;
    }
    if (!CFEqual(requestedTypeUUID, kAudioServerPlugInTypeUUID)) {
        return NULL;
    }
    return gArgusDriverRef;
}
