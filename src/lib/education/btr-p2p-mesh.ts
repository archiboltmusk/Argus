/**
 * Argus CoreBTR Zero-Cloud Local-Network "War Room" Head-to-Head Engine
 *
 * Enables synchronized, multi-candidate competitive drills over local network /
 * cross-window BroadcastChannel with zero cloud or API dependency.
 */

import type { ClinicalQuestion } from "./qbank-types";

export interface ClashPlayerState {
  playerId: string;
  displayName: string;
  avatarSeed: string;
  currentQuestionIndex: number;
  score: number;
  correctCount: number;
  incorrectCount: number;
  lastAnswerTimeMs: number;
  isFinished: boolean;
}

export interface ClashSession {
  sessionId: string;
  hostPlayerId: string;
  createdAt: number;
  questionIds: string[];
  status: "waiting" | "in_progress" | "completed";
  players: Record<string, ClashPlayerState>;
}

const BROADCAST_CHANNEL_NAME = "argus_corebtr_clash_mesh";

export class LocalWarRoomMesh {
  private channel: BroadcastChannel | null = null;
  private localPlayerId: string;
  private displayName: string;
  private onSessionUpdate?: (session: ClashSession) => void;
  private currentSession: ClashSession | null = null;

  constructor(displayName: string = "Dr. Candidate") {
    this.localPlayerId = `player_${Math.random().toString(36).substring(2, 9)}`;
    this.displayName = displayName;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.channel.onmessage = (event) => this.handleMessage(event.data);
    }
  }

  public subscribe(callback: (session: ClashSession) => void) {
    this.onSessionUpdate = callback;
  }

  public createSession(questions: ClinicalQuestion[]): ClashSession {
    const session: ClashSession = {
      sessionId: `clash_${Date.now()}`,
      hostPlayerId: this.localPlayerId,
      createdAt: Date.now(),
      questionIds: questions.map((q) => q.id),
      status: "waiting",
      players: {
        [this.localPlayerId]: {
          playerId: this.localPlayerId,
          displayName: this.displayName,
          avatarSeed: this.localPlayerId,
          currentQuestionIndex: 0,
          score: 0,
          correctCount: 0,
          incorrectCount: 0,
          lastAnswerTimeMs: 0,
          isFinished: false,
        },
      },
    };

    this.currentSession = session;
    this.broadcast({ type: "SESSION_CREATED", session });
    this.onSessionUpdate?.(session);
    return session;
  }

  public joinSession(sessionId: string) {
    this.broadcast({
      type: "PLAYER_JOINED",
      sessionId,
      player: {
        playerId: this.localPlayerId,
        displayName: this.displayName,
        avatarSeed: this.localPlayerId,
        currentQuestionIndex: 0,
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        lastAnswerTimeMs: 0,
        isFinished: false,
      },
    });
  }

  public recordAnswer(questionIndex: number, isCorrect: boolean, elapsedSeconds: number) {
    if (!this.currentSession) return;

    const player = this.currentSession.players[this.localPlayerId];
    if (!player) return;

    const newScore = player.score + (isCorrect ? 4 : -1);
    const updatedPlayer: ClashPlayerState = {
      ...player,
      currentQuestionIndex: questionIndex + 1,
      score: newScore,
      correctCount: player.correctCount + (isCorrect ? 1 : 0),
      incorrectCount: player.incorrectCount + (isCorrect ? 0 : 1),
      lastAnswerTimeMs: elapsedSeconds * 1000,
    };

    this.currentSession.players[this.localPlayerId] = updatedPlayer;
    this.broadcast({
      type: "PLAYER_PROGRESS",
      sessionId: this.currentSession.sessionId,
      player: updatedPlayer,
    });
    this.onSessionUpdate?.(this.currentSession);
  }

  private broadcast(message: any) {
    try {
      this.channel?.postMessage(message);
    } catch {
      // BroadcastChannel unavailable
    }
  }

  private handleMessage(data: any) {
    if (!data || !data.type) return;

    switch (data.type) {
      case "SESSION_CREATED":
        this.currentSession = data.session;
        this.onSessionUpdate?.(data.session);
        break;

      case "PLAYER_JOINED":
        if (this.currentSession && this.currentSession.sessionId === data.sessionId) {
          this.currentSession.players[data.player.playerId] = data.player;
          this.onSessionUpdate?.(this.currentSession);
        }
        break;

      case "PLAYER_PROGRESS":
        if (this.currentSession && this.currentSession.sessionId === data.sessionId) {
          this.currentSession.players[data.player.playerId] = data.player;
          this.onSessionUpdate?.(this.currentSession);
        }
        break;
    }
  }

  public getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public destroy() {
    this.channel?.close();
    this.channel = null;
  }
}

export { LocalWarRoomMesh as BTRLocalWarRoomMesh };
