export type CodecSupport = {
  codec: string;
  label: string;
  supported: boolean;
  smooth: boolean;
  powerEfficient: boolean;
};

export type HardwareProfile = {
  gpuRenderer: string;
  colorDepth: number;
  hdrSupported: boolean;
  codecs: CodecSupport[];
};

export async function probeHardwareProfile(): Promise<HardwareProfile> {
  let gpuRenderer = "Software / Unknown";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "WebGL Available";
      } else {
        gpuRenderer = "WebGL 2 Hardware";
      }
    }
  } catch {
    /* ignore */
  }

  const colorDepth = typeof screen !== "undefined" ? screen.colorDepth : 24;
  let hdrSupported = false;
  try {
    if (typeof window !== "undefined" && window.matchMedia) {
      hdrSupported = window.matchMedia("(dynamic-range: high)").matches;
    }
  } catch {
    /* ignore */
  }

  const TARGETS = [
    { label: "4K H.264 (AVC)", contentType: 'video/mp4; codecs="avc1.640033"', width: 3840, height: 2160, bitrate: 20000000, framerate: 60 },
    { label: "4K HEVC (H.265)", contentType: 'video/mp4; codecs="hev1.1.6.L153.B0"', width: 3840, height: 2160, bitrate: 25000000, framerate: 60 },
    { label: "4K AV1", contentType: 'video/mp4; codecs="av01.0.12M.10"', width: 3840, height: 2160, bitrate: 20000000, framerate: 60 },
    { label: "4K VP9", contentType: 'video/webm; codecs="vp09.00.51.08"', width: 3840, height: 2160, bitrate: 18000000, framerate: 60 },
    { label: "1080p H.264", contentType: 'video/mp4; codecs="avc1.42E01E"', width: 1920, height: 1080, bitrate: 8000000, framerate: 60 },
  ];

  const codecs: CodecSupport[] = [];
  if (typeof navigator !== "undefined" && navigator.mediaCapabilities?.decodingInfo) {
    for (const t of TARGETS) {
      try {
        const info = await navigator.mediaCapabilities.decodingInfo({
          type: "file",
          video: {
            contentType: t.contentType,
            width: t.width,
            height: t.height,
            bitrate: t.bitrate,
            framerate: t.framerate,
          },
        });
        codecs.push({
          codec: t.contentType,
          label: t.label,
          supported: info.supported,
          smooth: info.smooth,
          powerEfficient: info.powerEfficient,
        });
      } catch {
        codecs.push({
          codec: t.contentType,
          label: t.label,
          supported: false,
          smooth: false,
          powerEfficient: false,
        });
      }
    }
  } else {
    // Fallback baseline for environments without mediaCapabilities
    codecs.push(
      { codec: "avc1", label: "H.264 (AVC)", supported: true, smooth: true, powerEfficient: true },
      { codec: "hevc", label: "HEVC (H.265)", supported: true, smooth: true, powerEfficient: true },
      { codec: "av1", label: "AV1 (Software/Hardware)", supported: true, smooth: true, powerEfficient: false },
    );
  }

  return {
    gpuRenderer,
    colorDepth,
    hdrSupported,
    codecs,
  };
}
