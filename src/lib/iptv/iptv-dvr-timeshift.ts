/**
 * Live IPTV Timeshift & Scheduled Background DVR Recorder
 *
 * Implements Kodi-level live broadcast timeshifting (rewinding live TV up to 60 mins)
 * and scheduled Electronic Program Guide (EPG) background DVR recordings.
 */

export interface TimeshiftBufferState {
  channelId: string;
  bufferStartMs: number;
  liveHeadMs: number;
  currentPlaybackMs: number;
  maxRetentionSec: number; // default: 3600 (60 minutes)
  isLiveHead: boolean;
}

export interface DvrRecordingSchedule {
  id: string;
  channelId: string;
  channelName: string;
  streamUrl: string;
  programTitle: string;
  startTimeMs: number;
  durationMinutes: number;
  outputPath: string;
  status: "scheduled" | "recording" | "completed" | "failed";
  recordedBytes?: number;
  errorMessage?: string;
}

export class IptvTimeshiftManager {
  private state: TimeshiftBufferState | null = null;
  private maxRetentionSec: number;

  constructor(maxRetentionSec: number = 3600) {
    this.maxRetentionSec = maxRetentionSec;
  }

  public initializeChannel(channelId: string, initialTimestampMs: number = Date.now()): TimeshiftBufferState {
    this.state = {
      channelId,
      bufferStartMs: initialTimestampMs,
      liveHeadMs: initialTimestampMs,
      currentPlaybackMs: initialTimestampMs,
      maxRetentionSec: this.maxRetentionSec,
      isLiveHead: true,
    };
    return this.state;
  }

  public updateLiveHead(newHeadMs: number): TimeshiftBufferState | null {
    if (!this.state) return null;

    this.state.liveHeadMs = Math.max(this.state.liveHeadMs, newHeadMs);
    // Purge buffer older than max retention window
    const maxWindowMs = this.maxRetentionSec * 1000;
    if (this.state.liveHeadMs - this.state.bufferStartMs > maxWindowMs) {
      this.state.bufferStartMs = this.state.liveHeadMs - maxWindowMs;
    }

    if (this.state.isLiveHead) {
      this.state.currentPlaybackMs = this.state.liveHeadMs;
    }

    return this.getState();
  }

  /**
   * Seeks backwards or forwards within the available timeshift window.
   */
  public seekTimeshift(offsetSecondsFromLive: number): TimeshiftBufferState | null {
    if (!this.state) return null;

    // offsetSecondsFromLive <= 0 (e.g. -300s = 5 minutes behind live)
    const targetMs = this.state.liveHeadMs + offsetSecondsFromLive * 1000;
    const clampedMs = Math.max(this.state.bufferStartMs, Math.min(this.state.liveHeadMs, targetMs));

    this.state.currentPlaybackMs = clampedMs;
    // Considered live head if within 3 seconds of the edge
    this.state.isLiveHead = Math.abs(this.state.liveHeadMs - this.state.currentPlaybackMs) <= 3000;

    return this.getState();
  }

  public jumpToLive(): TimeshiftBufferState | null {
    if (!this.state) return null;
    this.state.currentPlaybackMs = this.state.liveHeadMs;
    this.state.isLiveHead = true;
    return this.getState();
  }

  public getState(): TimeshiftBufferState | null {
    if (!this.state) return null;
    return { ...this.state };
  }
}

export class DvrSchedulerQueue {
  private schedules = new Map<string, DvrRecordingSchedule>();

  public scheduleProgram(
    channelId: string,
    channelName: string,
    streamUrl: string,
    programTitle: string,
    startTimeMs: number,
    durationMinutes: number,
  ): DvrRecordingSchedule {
    const id = `dvr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const schedule: DvrRecordingSchedule = {
      id,
      channelId,
      channelName,
      streamUrl,
      programTitle,
      startTimeMs,
      durationMinutes,
      outputPath: `recordings/${channelName.replace(/\W+/g, "_")}_${programTitle.replace(/\W+/g, "_")}.mkv`,
      status: "scheduled",
    };

    this.schedules.set(id, schedule);
    return schedule;
  }

  public getSchedule(id: string): DvrRecordingSchedule | undefined {
    return this.schedules.get(id);
  }

  public getAllSchedules(): DvrRecordingSchedule[] {
    return Array.from(this.schedules.values()).sort((a, b) => a.startTimeMs - b.startTimeMs);
  }

  public cancelSchedule(id: string): boolean {
    return this.schedules.delete(id);
  }

  /**
   * Ticks the scheduler against current wall-clock time to transition scheduled recordings to active.
   */
  public evaluateTick(nowMs: number = Date.now()): {
    toStart: DvrRecordingSchedule[];
    toFinish: DvrRecordingSchedule[];
  } {
    const toStart: DvrRecordingSchedule[] = [];
    const toFinish: DvrRecordingSchedule[] = [];

    for (const schedule of this.schedules.values()) {
      const endTimeMs = schedule.startTimeMs + schedule.durationMinutes * 60 * 1000;

      if (schedule.status === "scheduled" && nowMs >= schedule.startTimeMs && nowMs < endTimeMs) {
        schedule.status = "recording";
        toStart.push(schedule);
      } else if (schedule.status === "recording" && nowMs >= endTimeMs) {
        schedule.status = "completed";
        toFinish.push(schedule);
      }
    }

    return { toStart, toFinish };
  }
}
