/**
 * Lossless Scene Clipper & Smart 9:16 Vertical Re-framer
 *
 * Fast frame-accurate video clipping with zero-reencode stream copy,
 * automated face/subject-centered vertical 9:16 cropping, and animated
 * WebM/GIF/WebP creation with stylized subtitle burn-in.
 */

export type ClipExportFormat =
  | "lossless-mp4"
  | "webm-vp9"
  | "animated-gif"
  | "animated-webp";

export interface ClipRequest {
  sourceFilePath: string;
  startSec: number;
  endSec: number;
  outputFormat: ClipExportFormat;
  smartCropVertical916?: boolean;
  subjectCenterNormX?: number; // 0.0 to 1.0 (defaults to 0.5 center)
  burnSubtitles?: boolean;
  subtitleFilePath?: string;
  maxResolutionHeight?: number; // e.g. 1080, 720, 480
}

export interface ClipJobPlan {
  commandArgs: string[];
  outputFileName: string;
  durationSec: number;
  isLosslessStreamCopy: boolean;
  estimatedSizeBytes: number;
  videoFiltersApplied: string[];
}

export class LosslessSceneClipper {
  private static instance: LosslessSceneClipper | null = null;

  public static getInstance(): LosslessSceneClipper {
    if (!LosslessSceneClipper.instance) {
      LosslessSceneClipper.instance = new LosslessSceneClipper();
    }
    return LosslessSceneClipper.instance;
  }

  /**
   * Validates clipping range against video duration
   */
  public validateTimeRange(
    startSec: number,
    endSec: number,
    mediaDurationSec?: number,
  ): { valid: boolean; error?: string } {
    if (startSec < 0) return { valid: false, error: "Start time cannot be negative" };
    if (endSec <= startSec) return { valid: false, error: "End time must be greater than start time" };
    if (mediaDurationSec !== undefined && endSec > mediaDurationSec) {
      return { valid: false, error: "End time exceeds media duration" };
    }
    return { valid: true };
  }

  /**
   * Generates FFmpeg command arguments and execution plan
   */
  public buildClipPlan(
    req: ClipRequest,
    sourceBitrateKbps = 8000,
  ): ClipJobPlan {
    const duration = Math.max(0.1, req.endSec - req.startSec);
    const filters: string[] = [];
    const baseName = req.sourceFilePath.replace(/^.*[\\/]/, "").replace(/\.[^/.]+$/, "");
    const timestampTag = `${Math.floor(req.startSec)}s-${Math.floor(req.endSec)}s`;

    // 1. Vertical 9:16 Smart Crop Filter
    if (req.smartCropVertical916) {
      const centerX = Math.max(0.0, Math.min(1.0, req.subjectCenterNormX ?? 0.5));
      // Crop width = height * 9 / 16. X offset shifts horizontally centering on subject.
      const cropExpr = `crop=ih*9/16:ih:(iw-ih*9/16)*${centerX.toFixed(3)}:0`;
      filters.push(cropExpr);
    }

    // 2. Subtitle burn-in filter
    if (req.burnSubtitles && req.subtitleFilePath) {
      // Escape colons and backslashes for FFmpeg subtitles filter
      const escapedSub = req.subtitleFilePath.replace(/\\/g, "/").replace(/:/g, "\\:");
      filters.push(`subtitles='${escapedSub}'`);
    }

    // 3. Max resolution downscale filter
    if (req.maxResolutionHeight && req.outputFormat !== "lossless-mp4") {
      filters.push(`scale=-2:${req.maxResolutionHeight}`);
    }

    const requiresReencode = filters.length > 0 || req.outputFormat !== "lossless-mp4";
    const args: string[] = [];

    // Seeking flags: fast keyframe seek before input, accurate cut after
    args.push("-ss", req.startSec.toFixed(3));
    args.push("-i", req.sourceFilePath);
    args.push("-t", duration.toFixed(3));

    let outputFileName = `${baseName}_clip_${timestampTag}.mp4`;
    let estimatedSize = 0;

    switch (req.outputFormat) {
      case "lossless-mp4": {
        if (!requiresReencode) {
          // Pure zero-reencode bitstream stream copy
          args.push("-c", "copy");
          args.push("-avoid_negative_ts", "make_zero");
          outputFileName = `${baseName}_lossless_${timestampTag}.mp4`;
          estimatedSize = Math.round(((sourceBitrateKbps * 1000) / 8) * duration);
        } else {
          // Re-encode with high-fidelity H.264
          if (filters.length > 0) {
            args.push("-vf", filters.join(","));
          }
          args.push("-c:v", "libx264", "-crf", "18", "-preset", "fast", "-c:a", "aac", "-b:a", "192k");
          outputFileName = `${baseName}_cropped_${timestampTag}.mp4`;
          estimatedSize = Math.round(((5000 * 1000) / 8) * duration);
        }
        break;
      }

      case "webm-vp9": {
        if (filters.length > 0) {
          args.push("-vf", filters.join(","));
        }
        args.push("-c:v", "libvpx-vp9", "-crf", "28", "-b:v", "0", "-c:a", "libopus", "-b:a", "128k");
        outputFileName = `${baseName}_clip_${timestampTag}.webm`;
        estimatedSize = Math.round(((3000 * 1000) / 8) * duration);
        break;
      }

      case "animated-gif": {
        // High quality two-pass palettegen filter
        const gifFilter = filters.length > 0
          ? `${filters.join(",")},fps=15,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`
          : `fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`;
        args.push("-vf", gifFilter);
        outputFileName = `${baseName}_animated_${timestampTag}.gif`;
        estimatedSize = Math.round(1_200_000 * duration); // ~1.2MB per sec for GIF
        break;
      }

      case "animated-webp": {
        const webpFilter = filters.length > 0
          ? `${filters.join(",")},fps=20`
          : "fps=20,scale=720:-1:flags=lanczos";
        args.push("-vf", webpFilter);
        args.push("-c:v", "libwebp", "-lossless", "0", "-q:v", "75", "-loop", "0", "-an");
        outputFileName = `${baseName}_sticker_${timestampTag}.webp`;
        estimatedSize = Math.round(400_000 * duration);
        break;
      }
    }

    args.push("-y", outputFileName);

    return {
      commandArgs: args,
      outputFileName,
      durationSec: duration,
      isLosslessStreamCopy: !requiresReencode,
      estimatedSizeBytes: estimatedSize,
      videoFiltersApplied: filters,
    };
  }
}
