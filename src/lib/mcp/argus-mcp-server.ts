/**
 * Argus Model Context Protocol (MCP) Server
 *
 * Implements the open standard Model Context Protocol (MCP) to turn Argus from
 * a passive video player into an "agent-callable cultural artifact".
 *
 * Exposes:
 * 1. Resources: `argus://library/all`, `argus://library/unwatched`, `argus://player/state`
 * 2. Prompts: `evening-recommendation`, `catch-me-up`
 * 3. Tools: `query_media_library`, `discover_mood_match`, `play_media`, `playback_control`
 *
 * Fully local-first, zero telemetry, works with Claude Desktop, Cursor, or local LLM agents.
 */

import {
  LocalAiDiscoveryEngine,
  PsychologicalMood,
  CoPresenceState,
  CatalogItemForDiscovery,
} from "../algo/local-ai-discovery";

export interface McpJsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface McpJsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface PlayerStateSnapshot {
  mediaId: string | null;
  title: string | null;
  status: "playing" | "paused" | "idle";
  positionSec: number;
  durationSec: number;
  activeChapter: string | null;
  clearVoiceActive: boolean;
}

export class ArgusMcpServer {
  private discoveryEngine: LocalAiDiscoveryEngine;
  private catalog: CatalogItemForDiscovery[] = [];
  private playerState: PlayerStateSnapshot = {
    mediaId: null,
    title: null,
    status: "idle",
    positionSec: 0,
    durationSec: 0,
    activeChapter: null,
    clearVoiceActive: false,
  };

  private playCallback?: (mediaId: string, startSec?: number) => void;
  private controlCallback?: (action: string, value?: any) => void;

  constructor(
    initialCatalog: CatalogItemForDiscovery[] = [],
    playCallback?: (mediaId: string, startSec?: number) => void,
    controlCallback?: (action: string, value?: any) => void
  ) {
    this.catalog = [...initialCatalog];
    this.discoveryEngine = new LocalAiDiscoveryEngine(this.catalog);
    this.playCallback = playCallback;
    this.controlCallback = controlCallback;
  }

  public setPlayerState(state: Partial<PlayerStateSnapshot>): void {
    this.playerState = { ...this.playerState, ...state };
  }

  public updateCatalog(items: CatalogItemForDiscovery[]): void {
    this.catalog = [...items];
    this.discoveryEngine = new LocalAiDiscoveryEngine(this.catalog);
  }

  /**
   * Main JSON-RPC 2.0 Handler conforming to MCP specification
   */
  public async handleMessage(request: McpJsonRpcRequest): Promise<McpJsonRpcResponse> {
    const { id, method, params } = request;

    try {
      switch (method) {
        // Initialization handshake
        case "initialize":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                resources: { subscribe: false, listChanged: false },
                prompts: { listChanged: false },
                tools: { listChanged: false },
              },
              serverInfo: {
                name: "argus-mcp-server",
                version: "3.18.0",
              },
            },
          };

        // Resources list
        case "resources/list":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              resources: [
                {
                  uri: "argus://library/all",
                  name: "Argus Media Library (All)",
                  description: "Full local media library index and metadata.",
                  mimeType: "application/json",
                },
                {
                  uri: "argus://library/unwatched",
                  name: "Argus Media Library (Unwatched)",
                  description: "Titles in local collection that have not yet been watched.",
                  mimeType: "application/json",
                },
                {
                  uri: "argus://player/state",
                  name: "Argus Live Playback State",
                  description: "Live snapshot of the currently active video playback, timecode, and audio status.",
                  mimeType: "application/json",
                },
              ],
            },
          };

        // Resource Read
        case "resources/read": {
          const uri = params?.uri;
          if (uri === "argus://library/all") {
            return {
              jsonrpc: "2.0",
              id,
              result: {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(this.catalog, null, 2),
                  },
                ],
              },
            };
          } else if (uri === "argus://library/unwatched") {
            const unwatched = this.catalog.filter((i) => i.unwatched);
            return {
              jsonrpc: "2.0",
              id,
              result: {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(unwatched, null, 2),
                  },
                ],
              },
            };
          } else if (uri === "argus://player/state") {
            return {
              jsonrpc: "2.0",
              id,
              result: {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(this.playerState, null, 2),
                  },
                ],
              },
            };
          }
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: `Resource not found: ${uri}` },
          };
        }

        // Prompts list
        case "prompts/list":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              prompts: [
                {
                  name: "evening-recommendation",
                  description: "Generate an intelligent, single film recommendation based on mood and time available.",
                  arguments: [
                    { name: "mood", description: "Psychological craving (e.g. need-resolution, need-to-borrow-grief)", required: true },
                    { name: "minutesAvailable", description: "Max minutes available to watch", required: false },
                  ],
                },
                {
                  name: "catch-me-up",
                  description: "Generate a zero-spoiler synopsis of events up to the current playback timestamp.",
                  arguments: [],
                },
              ],
            },
          };

        // Tools list
        case "tools/list":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              tools: [
                {
                  name: "query_media_library",
                  description: "Search or filter items in the local Argus media library.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      query: { type: "string", description: "Keyword or title query" },
                      unwatchedOnly: { type: "boolean", description: "Only return unwatched titles" },
                    },
                  },
                },
                {
                  name: "discover_mood_match",
                  description: "Find the single most resonant movie for a specific mood, time budget, and social setting.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      mood: {
                        type: "string",
                        enum: [
                          "need-resolution",
                          "need-to-borrow-grief",
                          "need-to-be-bored",
                          "need-transcendence",
                          "need-pure-kinetic-energy",
                          "need-intellectual-puzzle",
                        ],
                      },
                      timeConstraintMinutes: { type: "number" },
                      coPresence: { type: "string", enum: ["alone", "with-partner", "with-group-or-strangers"] },
                    },
                    required: ["mood", "timeConstraintMinutes", "coPresence"],
                  },
                },
                {
                  name: "play_media",
                  description: "Command Argus to play a specific title from the library.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      mediaId: { type: "string" },
                      startSec: { type: "number" },
                    },
                    required: ["mediaId"],
                  },
                },
                {
                  name: "playback_control",
                  description: "Control playback (pause, resume, seek, or toggle ClearVoice speech boost).",
                  inputSchema: {
                    type: "object",
                    properties: {
                      action: { type: "string", enum: ["pause", "resume", "seek", "toggle-clearvoice"] },
                      value: { type: "any" },
                    },
                    required: ["action"],
                  },
                },
              ],
            },
          };

        // Tool Call Execution
        case "tools/call": {
          const toolName = params?.name;
          const args = params?.arguments || {};

          if (toolName === "query_media_library") {
            const query = (args.query || "").toLowerCase();
            const unwatchedOnly = !!args.unwatchedOnly;
            const matches = this.catalog.filter((item) => {
              if (unwatchedOnly && !item.unwatched) return false;
              if (!query) return true;
              return (
                item.title.toLowerCase().includes(query) ||
                item.genres.some((g) => g.toLowerCase().includes(query)) ||
                (item.director && item.director.toLowerCase().includes(query))
              );
            });
            return {
              jsonrpc: "2.0",
              id,
              result: { content: [{ type: "text", text: JSON.stringify(matches, null, 2) }] },
            };
          }

          if (toolName === "discover_mood_match") {
            const match = this.discoveryEngine.resolveSovereignEncounter({
              mood: args.mood as PsychologicalMood,
              timeConstraintMinutes: Number(args.timeConstraintMinutes) || 120,
              coPresence: args.coPresence as CoPresenceState,
              unwatchedOnly: true,
            });
            return {
              jsonrpc: "2.0",
              id,
              result: {
                content: [{ type: "text", text: match ? JSON.stringify(match, null, 2) : "No match found in local catalog." }],
              },
            };
          }

          if (toolName === "play_media") {
            if (this.playCallback) {
              this.playCallback(args.mediaId, args.startSec);
            }
            return {
              jsonrpc: "2.0",
              id,
              result: { content: [{ type: "text", text: `Playback initiated for media: ${args.mediaId}` }] },
            };
          }

          if (toolName === "playback_control") {
            if (this.controlCallback) {
              this.controlCallback(args.action, args.value);
            }
            return {
              jsonrpc: "2.0",
              id,
              result: { content: [{ type: "text", text: `Playback command executed: ${args.action}` }] },
            };
          }

          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Unknown tool: ${toolName}` },
          };
        }

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
          };
      }
    } catch (err: any) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: `Internal server error: ${err?.message || err}` },
      };
    }
  }
}
