/** Decode a bundled, silent fixture without contacting an external service. */
export function probeVideoDecode(
  url: string,
  makeVideo = () => document.createElement("video"),
): Promise<boolean> {
  return new Promise((resolve) => {
    const video = makeVideo();
    const timer = setTimeout(() => finish(false), 5000);
    function finish(ok: boolean) {
      clearTimeout(timer);
      video.onloadeddata = null;
      video.onerror = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      resolve(ok);
    }
    video.muted = true;
    video.preload = "auto";
    video.onloadeddata = () => finish(video.videoWidth > 0 && video.readyState >= 2);
    video.onerror = () => finish(false);
    video.src = url;
    video.load();
  });
}
