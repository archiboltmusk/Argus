import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ReactiveAmbilightEngine,
  PerimeterEdgeZones,
  AmbilightDeviceTarget,
} from "../src/lib/ambient/reactive-ambilight-engine.ts";

import {
  NeuralInpaintShield,
  BoundingBoxROI,
  PRESET_DETECTION_ZONES,
} from "../src/lib/video/neural-inpaint-shield.ts";

import {
  BinauralSpatialAudio,
  STANDARD_CHANNEL_MAP,
} from "../src/lib/audio/binaural-spatial-audio.ts";

import {
  MultiAngleDirector,
  CameraAngleStream,
} from "../src/lib/player/multi-angle-director.ts";

import {
  ColoristStudio,
  COLOR_GRADE_PRESETS,
} from "../src/lib/video/colorist-studio.ts";

describe("Cinematic Mastery Upgrade Suite (v3.13.0)", () => {
  describe("1. Reactive Ambilight & Smart Luminaire Engine", () => {
    it("should accurately convert RGB to CIE Lab and compute perceptual Delta-E", () => {
      const engine = new ReactiveAmbilightEngine();
      const pureRed = { r: 255, g: 0, b: 0 };
      const pureBlue = { r: 0, g: 0, b: 255 };
      const labRed = engine.rgbToLab(pureRed);

      assert.ok(labRed.l > 0, "Luminance should be positive");
      assert.ok(labRed.a > 0, "Red should have positive 'a' chromaticity");

      const delta = engine.deltaE(pureRed, pureBlue);
      assert.ok(delta > 50, "Red and Blue should have a large perceptual distance");

      const deltaSame = engine.deltaE(pureRed, pureRed);
      assert.equal(deltaSame, 0, "Identical colors must have 0 Delta-E");
    });

    it("should process edge samples, apply temporal smoothing and detect OLED blackout", () => {
      const engine = new ReactiveAmbilightEngine({ blackoutThreshold: 0.02 });

      // Vibrant frame
      const frame1 = engine.processEdgeSamples({
        top: [{ r: 200, g: 100, b: 50 }],
        bottom: [{ r: 200, g: 100, b: 50 }],
        left: [{ r: 180, g: 90, b: 40 }],
        right: [{ r: 180, g: 90, b: 40 }],
      });
      assert.ok(frame1.averageLuminance > 0.1);
      assert.equal(frame1.top[0].r, 200);

      // Pitch black frame triggers OLED blackout
      const frameBlack = engine.processEdgeSamples({
        top: [{ r: 1, g: 1, b: 1 }],
        bottom: [{ r: 0, g: 0, b: 0 }],
        left: [{ r: 0, g: 0, b: 0 }],
        right: [{ r: 0, g: 0, b: 0 }],
      });
      assert.equal(frameBlack.averageLuminance, 0);
      assert.equal(frameBlack.dominantColor.r, 0);
    });

    it("should format multi-ecosystem packets (Hue DTLS, Nanoleaf UDP, Razer Chroma, Elgato)", () => {
      const engine = new ReactiveAmbilightEngine();
      const hueTarget: AmbilightDeviceTarget = {
        id: "hue-1",
        name: "Living Room Lightstrip",
        protocol: "hue-entertainment",
        host: "192.168.1.100",
        port: 2100,
        channelIndex: 3,
        hardwareLatencyMs: 30,
      };
      const nanoleafTarget: AmbilightDeviceTarget = {
        id: "nano-1",
        name: "Back Wall Canvas",
        protocol: "nanoleaf-udp",
        host: "192.168.1.101",
        port: 60222,
        channelIndex: 1,
        hardwareLatencyMs: 25,
      };
      const razerTarget: AmbilightDeviceTarget = {
        id: "razer-1",
        name: "Desk Chroma Hub",
        protocol: "razer-chroma",
        host: "127.0.0.1",
        port: 12005,
        hardwareLatencyMs: 10,
      };
      const elgatoTarget: AmbilightDeviceTarget = {
        id: "elgato-1",
        name: "Studio Key Light",
        protocol: "elgato-keylight",
        host: "192.168.1.102",
        port: 9123,
        hardwareLatencyMs: 40,
      };

      engine.addTarget(hueTarget);
      engine.addTarget(nanoleafTarget);
      engine.addTarget(razerTarget);
      engine.addTarget(elgatoTarget);

      const zones: PerimeterEdgeZones = {
        top: [{ r: 255, g: 128, b: 0 }],
        bottom: [{ r: 255, g: 128, b: 0 }],
        left: [{ r: 255, g: 128, b: 0 }],
        right: [{ r: 255, g: 128, b: 0 }],
        averageLuminance: 0.65,
        dominantColor: { r: 255, g: 128, b: 0 },
      };

      const dispatches = engine.generateDispatches(zones, 42.5);
      assert.equal(dispatches.length, 4);

      const hue = dispatches.find((d) => d.protocol === "hue-entertainment");
      assert.ok(hue);
      assert.ok(hue.binaryOrJson instanceof Uint8Array);
      assert.ok(hue.binaryOrJson.length >= 18);

      const nano = dispatches.find((d) => d.protocol === "nanoleaf-udp");
      assert.ok(nano);
      assert.ok(nano.binaryOrJson instanceof Uint8Array);

      const razer = dispatches.find((d) => d.protocol === "razer-chroma");
      assert.ok(razer);
      assert.ok(typeof razer.binaryOrJson === "object");

      const elgato = dispatches.find((d) => d.protocol === "elgato-keylight");
      assert.ok(elgato);
      assert.ok(typeof elgato.binaryOrJson === "object");
    });
  });

  describe("2. Neural Hardsub & Watermark Inpainting Shield", () => {
    it("should translate normalized ROI to exact pixel boundaries and generate MPV delogo filter", () => {
      const shield = new NeuralInpaintShield();
      shield.setVideoResolution(3840, 2160); // 4K resolution

      const roi: BoundingBoxROI = {
        id: "logo-bug",
        name: "Corner Logo",
        type: "logo",
        x: 0.85,
        y: 0.05,
        width: 0.1,
        height: 0.05,
        featherRadius: 4,
        enabled: true,
      };

      shield.addRegion(roi);

      const coords = shield.getPixelCoordinates(roi);
      assert.equal(coords.px, Math.floor(0.85 * 3840));
      assert.equal(coords.py, Math.floor(0.05 * 2160));
      assert.equal(coords.pWidth, Math.floor(0.1 * 3840));
      assert.equal(coords.pHeight, Math.floor(0.05 * 2160));

      const filter = shield.generateMpvFilterString();
      assert.ok(filter);
      assert.ok(filter.includes("delogo=x="));
      assert.ok(filter.includes("band=4:show=0"));
    });

    it("should load preset detection zones and produce accurate telemetry", () => {
      const shield = new NeuralInpaintShield();
      shield.addPreset("bottom-hardsubs");
      shield.addPreset("top-right-logo");

      const telemetry = shield.getTelemetry();
      assert.equal(telemetry.activeMaskCount, 2);
      assert.ok(telemetry.coveredAreaPercentage > 0);
      assert.ok(telemetry.estimatedComputeOverheadMs > 0);
      assert.ok(telemetry.filterString?.includes("bottom-hardsubs") || telemetry.filterString?.includes("delogo"));
    });

    it("should compute bilateral edge-fill reconstruction for preview canvases", () => {
      const shield = new NeuralInpaintShield();
      shield.setVideoResolution(10, 10);

      const pixels = new Uint8ClampedArray(10 * 10 * 4);
      // Border pixels colored green (0, 255, 0, 255)
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 0;
        pixels[i + 1] = 255;
        pixels[i + 2] = 0;
        pixels[i + 3] = 255;
      }

      const roi: BoundingBoxROI = {
        id: "center-box",
        name: "Center Box",
        type: "watermark",
        x: 0.3,
        y: 0.3,
        width: 0.4,
        height: 0.4,
        featherRadius: 2,
        enabled: true,
      };

      const inpainted = shield.reconstructRegionBorderFill(pixels, roi);
      assert.equal(inpainted.length, pixels.length);
      // Check inpainted interior has green channel
      const interiorIdx = (4 * 10 + 4) * 4;
      assert.equal(inpainted[interiorIdx + 1], 255);
    });
  });

  describe("3. Binaural HRTF 3D Spatial Audio Virtualizer", () => {
    it("should calculate Woodworth Interaural Time Difference (ITD) and ILD", () => {
      const spatializer = new BinauralSpatialAudio();

      // Sound at 90 degrees right
      const rightItd = spatializer.calculateItd(90);
      assert.equal(rightItd.rightEarMs, 0, "Right ear receives sound first");
      assert.ok(rightItd.leftEarMs > 0.5 && rightItd.leftEarMs < 0.8, "Left ear delayed by ~0.65ms");

      // Sound at 0 degrees straight ahead
      const centerItd = spatializer.calculateItd(0);
      assert.equal(centerItd.leftEarMs, 0);
      assert.equal(centerItd.rightEarMs, 0);

      // Acoustic head shadow ILD
      const rightIld = spatializer.calculateIld(90);
      assert.equal(rightIld.rightEarDb, 0);
      assert.ok(rightIld.leftEarDb < -5.0, "Opposite ear experiences high-frequency attenuation");
    });

    it("should map 7.1.4 Dolby Atmos bed channels and generate spatial telemetry", () => {
      const spatializer = new BinauralSpatialAudio({ inputLayout: "7.1.4" });
      const telemetry = spatializer.getLayoutTelemetry();

      assert.equal(telemetry.length, STANDARD_CHANNEL_MAP["7.1.4"].length);
      const topBackLeft = telemetry.find((t) => t.channelId === "TBL");
      assert.ok(topBackLeft);
      assert.ok(topBackLeft.itdMs.rightEarMs > 0);
    });

    it("should generate MPV filter strings for cinema-reference and custom SOFA models", () => {
      const spatializer = new BinauralSpatialAudio({ roomProfile: "cinema-reference" });
      const refFilter = spatializer.generateMpvFilterString();
      assert.ok(refFilter);
      assert.ok(refFilter.includes("bs2b=profile=johansen"));
      assert.ok(refFilter.includes("extrastereo=m=1.2"));

      // With SOFA impulse file
      spatializer.updateConfig({ sofaModelPath: "/path/to/club_cinema.sofa" });
      const sofaFilter = spatializer.generateMpvFilterString();
      assert.ok(sofaFilter);
      assert.ok(sofaFilter.includes("sofalizer=sofa='/path/to/club_cinema.sofa'"));
    });
  });

  describe("4. Multi-Angle & Sports Director Cut Engine", () => {
    it("should register angle streams and maintain primary feed state", () => {
      const director = new MultiAngleDirector();
      const angleA: CameraAngleStream = {
        id: "cam-main",
        label: "Main Broadcast",
        streamUrl: "https://stream.internal/main.m3u8",
        hasAudio: true,
        isPrimary: true,
        currentClockSec: 100,
      };
      const angleB: CameraAngleStream = {
        id: "cam-onboard",
        label: "Onboard Driver POV",
        streamUrl: "https://stream.internal/onboard.m3u8",
        hasAudio: false,
        isPrimary: false,
        currentClockSec: 100,
      };

      director.registerAngle(angleA);
      director.registerAngle(angleB);

      assert.equal(director.getPrimaryAngle()?.id, "cam-main");

      const swapResult = director.switchToAngle("cam-onboard");
      assert.equal(swapResult.success, true);
      assert.equal(swapResult.swappedAngle?.id, "cam-onboard");
      assert.equal(swapResult.previousAngle?.id, "cam-main");
      assert.equal(director.getPrimaryAngle()?.id, "cam-onboard");
    });

    it("should compute drift and issue micro-rate adjustments or hard seek commands", () => {
      const director = new MultiAngleDirector({ syncThresholdMs: 15, hardSeekThresholdMs: 150 });
      director.setMasterClock(50.0);

      // Slave is perfectly synced (10ms drift)
      const adj1 = director.evaluateSyncDrift("cam-pit", 50.01);
      assert.equal(adj1.action, "in-sync");
      assert.equal(adj1.targetSpeed, 1.0);

      // Slave is slightly ahead (80ms drift) -> decelerate
      const adj2 = director.evaluateSyncDrift("cam-pit", 50.08);
      assert.equal(adj2.action, "rate-decelerate");
      assert.equal(adj2.targetSpeed, 0.97);

      // Slave is slightly behind (-80ms drift) -> accelerate
      const adj3 = director.evaluateSyncDrift("cam-pit", 49.92);
      assert.equal(adj3.action, "rate-accelerate");
      assert.equal(adj3.targetSpeed, 1.03);

      // Slave is far behind (300ms drift) -> hard seek
      const adj4 = director.evaluateSyncDrift("cam-pit", 49.7);
      assert.equal(adj4.action, "hard-seek");
    });

    it("should store and retrieve multi-cam bookmarks", () => {
      const director = new MultiAngleDirector();
      const bm = director.addBookmark({
        timestampSec: 124.5,
        recommendedAngleId: "cam-onboard",
        title: "Overtake Turn 3",
      });

      assert.ok(bm.id);
      const all = director.getBookmarks();
      assert.equal(all.length, 1);
      assert.equal(all[0].title, "Overtake Turn 3");
    });
  });

  describe("5. Colorist Studio & Film Grain Synthesis", () => {
    it("should apply ASC-CDL mathematical slope, offset, power, and saturation transforms", () => {
      const studio = new ColoristStudio();
      studio.applyPreset("hollywood-teal-orange");

      const neutralGrey = { r: 0.5, g: 0.5, b: 0.5 };
      const graded = studio.applyCdlTransform(neutralGrey);

      assert.ok(graded.r >= 0 && graded.r <= 1.0);
      assert.ok(graded.g >= 0 && graded.g <= 1.0);
      assert.ok(graded.b >= 0 && graded.b <= 1.0);
      // Teal and orange shifts warmer red/amber
      assert.ok(graded.r > graded.b, "Teal and Orange should warm up midtones");
    });

    it("should parse DaVinci Resolve / Adobe .cube 3D LUT files", () => {
      const studio = new ColoristStudio();
      const sampleCube = `
# Sample 3D LUT
TITLE "Kodak Cinema Look"
LUT_3D_SIZE 2
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
`;
      const parsed = studio.parseCubeLut(sampleCube);
      assert.equal(parsed.title, "Kodak Cinema Look");
      assert.equal(parsed.size, 2);
      assert.equal(parsed.data.length, 24); // 2^3 * 3
      assert.equal(parsed.data[0], 0.0);
      assert.equal(parsed.data[3], 1.0);
    });

    it("should generate MPV video filter string for custom LUT and film grain", () => {
      const studio = new ColoristStudio();
      studio.applyPreset("bleach-bypass");

      const filter = studio.generateMpvFilterString();
      assert.ok(filter);
      assert.ok(filter.includes("eq="));
      assert.ok(filter.includes("noise="));

      // With custom .cube path
      studio.updateConfig({ customLutPath: "/path/to/lut.cube" });
      const customFilter = studio.generateMpvFilterString();
      assert.ok(customFilter);
      assert.ok(customFilter.includes("lut3d=file='/path/to/lut.cube'"));
    });
  });
});
