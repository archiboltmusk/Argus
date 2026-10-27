import { useEffect, useState } from "react";
import { activeProfileId } from "@/lib/active-profile-id";
import {
  mediaServerConnections,
  subscribeMediaServerConnections,
} from "@/lib/media-server/connections";
import { identityMatches, mediaServerItems } from "@/lib/media-server/index-store";
import { groupMediaServerTitles } from "@/lib/media-server/selectors";
import type { MediaIdentity, MediaServerConnection } from "@/lib/media-server/types";

function titleIdentity(
  metaId: string | undefined,
  imdbId: string | null | undefined,
): MediaIdentity {
  const tmdb = metaId?.match(/^tmdb:(?:movie|tv|series):(\d+)$/);
  return {
    tmdbId: tmdb ? Number(tmdb[1]) : undefined,
    imdbId: imdbId ?? (metaId?.startsWith("tt") ? metaId : undefined),
  };
}

export function useTitleMediaServers(
  metaId: string | undefined,
  imdbId?: string | null,
): MediaServerConnection[] {
  const [matches, setMatches] = useState<MediaServerConnection[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const identity = titleIdentity(metaId, imdbId);
      if (identity.tmdbId == null && !identity.imdbId) {
        if (alive) setMatches([]);
        return;
      }
      const connections = mediaServerConnections().filter((connection) => connection.enabled);
      const enabled = new Set(connections.map((connection) => connection.id));
      const titles = groupMediaServerTitles(
        (await mediaServerItems()).filter((item) => enabled.has(item.connectionId)),
      );
      const connectionIds = new Set(
        titles
          .filter((title) => identityMatches(title.identity, identity))
          .flatMap((title) => title.connectionIds),
      );
      if (alive) setMatches(connections.filter((connection) => connectionIds.has(connection.id)));
    };
    void load().catch(() => {
      if (alive) setMatches([]);
    });
    const unsubscribe = subscribeMediaServerConnections(() => void load());
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [metaId, imdbId]);

  return matches;
}


/**
 * Resolve home-server availability for a whole search rail in one index read,
 * rather than issuing one IndexedDB query per poster row.
 */
export function useMediaServerAvailability(
  metas: Array<{ id: string }>,
): Map<string, string[]> {
  const [availability, setAvailability] = useState<Map<string, string[]>>(() => new Map());
  const idsKey = JSON.stringify([activeProfileId(), ...metas.map((meta) => meta.id)]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const connections = mediaServerConnections().filter((connection) => connection.enabled);
      const enabled = new Map(connections.map((connection) => [connection.id, connection]));
      if (enabled.size === 0) {
        if (alive) setAvailability(new Map());
        return;
      }
      const items = await mediaServerItems();
      const titles = groupMediaServerTitles(items.filter((item) => enabled.has(item.connectionId)));
      const next = new Map<string, string[]>();
      for (const metaId of (JSON.parse(idsKey) as string[]).slice(1)) {
        const identity = titleIdentity(metaId, undefined);
        if (identity.tmdbId == null && !identity.imdbId) continue;
        const matches = titles.filter((title) => identityMatches(title.identity, identity));
        const names = [...new Set(matches.flatMap((title) =>
          title.connectionIds.flatMap((id) => {
            const connection = enabled.get(id);
            return connection ? [connection.name] : [];
          }),
        ))];
        if (names.length) next.set(metaId, names);
      }
      if (alive) setAvailability(next);
    };
    void load().catch(() => {
      if (alive) setAvailability(new Map());
    });
    const unsubscribe = subscribeMediaServerConnections(() => void load());
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [idsKey]);

  return availability;
}
