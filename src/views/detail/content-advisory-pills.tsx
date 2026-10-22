import { useEffect, useState } from "react";
import { metaFor, SEV_RANK } from "@/components/player/content-advisory-toast";
import { useT } from "@/lib/i18n";
import { isAdvisoryIgnored } from "@/lib/player/content-advisory-ignore";
import {
  argusImdbMpaRating,
  argusImdbParental,
  type ParentalCategory,
} from "@/lib/providers/argus-imdb";
import { Pill } from "./pill";

const SEV_TEXT: Record<string, string> = {
  Severe: "text-danger",
  Moderate: "text-accent",
  Mild: "text-ink-subtle",
};

export function ContentAdvisoryPills({ imdbId }: { imdbId: string | null | undefined }) {
  const t = useT();
  const [categories, setCategories] = useState<ParentalCategory[]>([]);
  const [mpa, setMpa] = useState<string | null>(null);

  useEffect(() => {
    setCategories([]);
    setMpa(null);
    if (!imdbId || !imdbId.startsWith("tt") || isAdvisoryIgnored(imdbId)) return;
    let cancelled = false;
    argusImdbParental(imdbId)
      .then((c) => {
        if (cancelled) return;
        setCategories(c);
        setMpa(argusImdbMpaRating(imdbId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [imdbId]);

  const rated = categories
    .filter((c) => (SEV_RANK[c.severity] ?? 0) > 0)
    .sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0));
  if (rated.length === 0 && !mpa) return null;

  return (
    <>
      {mpa && (
        <Pill>
          <span className="font-semibold">{mpa}</span>
        </Pill>
      )}
      {rated.map((c) => {
        const { Icon, label } = metaFor(c.category);
        return (
          <Pill key={c.category}>
            <Icon size={13} className={SEV_TEXT[c.severity] ?? "text-ink-subtle"} />
            <span>{t(label)}</span>
            <span className={`text-[11px] font-semibold ${SEV_TEXT[c.severity] ?? ""}`}>
              {t(c.severity)}
            </span>
          </Pill>
        );
      })}
    </>
  );
}
