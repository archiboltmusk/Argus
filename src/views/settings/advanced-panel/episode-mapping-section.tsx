import { useProfiles } from "@/lib/profiles";
import { useEffect, useState } from "react";
import {
  readEpisodeMappingOverrides,
  saveEpisodeMappingOverride,
  removeEpisodeMappingOverride,
} from "@/lib/episode-mapping-overrides";

export function EpisodeMappingSection() {
  const { activeProfile } = useProfiles();
  useEffect(() => {
    setRows(readEpisodeMappingOverrides());
    setNotice("");
  }, [activeProfile?.id]);
  const [rows, setRows] = useState(readEpisodeMappingOverrides);
  const [fields, setFields] = useState({
    kitsuId: "",
    episode: "",
    imdbId: "",
    season: "",
    providerEpisode: "",
  });
  const [notice, setNotice] = useState("");
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Anime episode mapping corrections</h2>
      <p className="text-sm text-ink-subtle">
        Correct one episode in the current profile. Kitsu numbering still controls anime tracker
        progress; IMDb season/episode controls provider lookup. Reopen the title after saving.
        Existing history is preserved.
      </p>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            if (Object.values(fields).some((value) => !value.trim()))
              throw new Error("Complete all five fields.");
            saveEpisodeMappingOverride({
              kitsuId: Number(fields.kitsuId),
              episode: Number(fields.episode),
              imdbId: fields.imdbId.trim(),
              season: Number(fields.season),
              providerEpisode: Number(fields.providerEpisode),
            });
            setRows(readEpisodeMappingOverrides());
            setNotice("Saved. Reopen the title to apply the correction.");
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Unable to save correction");
          }
        }}
      >
        {(
          [
            ["kitsuId", "Kitsu entry ID"],
            ["episode", "Kitsu episode"],
            ["imdbId", "IMDb series ID (tt…)"],
            ["season", "Provider season"],
            ["providerEpisode", "Provider episode"],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="flex flex-col gap-1 text-sm">
            {label}
            <input
              required
              type={name === "imdbId" ? "text" : "number"}
              min={name === "kitsuId" ? 1 : 0}
              step="1"
              className="w-44 rounded border border-edge-soft bg-canvas p-2"
              value={fields[name]}
              onChange={(event) =>
                setFields((current) => ({ ...current, [name]: event.target.value }))
              }
            />
          </label>
        ))}
        <button type="submit" className="self-end rounded bg-accent px-3 py-2 text-canvas">
          Save correction
        </button>
      </form>
      <p role="status" className="text-sm">
        {notice}
      </p>
      {rows.map((row) => (
        <div
          key={`${row.kitsuId}:${row.episode}`}
          className="flex flex-wrap items-center gap-3 text-sm"
        >
          <span>
            Kitsu {row.kitsuId} E{row.episode} → {row.imdbId} S{row.season} E{row.providerEpisode}
          </span>
          <button
            type="button"
            className="rounded border border-edge-soft px-3 py-2"
            onClick={() => {
              try {
                removeEpisodeMappingOverride(row.kitsuId, row.episode);
                setRows(readEpisodeMappingOverrides());
                setNotice("Removed. Reopen the title to restore provider mapping.");
              } catch {
                setNotice("Unable to remove correction. Check local storage.");
              }
            }}
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}
