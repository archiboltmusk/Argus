package android.content.pm

import argus.compat.host.PlatformHost

class ApplicationInfo {

    @JvmField
    var dataDir: String = PlatformHost.dataDir.absolutePath
}
