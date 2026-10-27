import { useEffect, useRef, useState } from "react";
import { cleanWord, lookupWord, type WordEntry } from "@/lib/dictionary";
import { useT } from "@/lib/i18n";

const HOVER_DELAY_MS = 220;

type Shown = { index: number; entry: WordEntry | null; loading: boolean };

export function HoverWordLine({ line, lang }: { line: string; lang: string }) {
  const t = useT();
  const [shown, setShown] = useState<Shown | null>(null);
  const timer = useRef<number | null>(null);
  const seq = useRef(0);
  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  const leave = () => {
    seq.current++;
    if (timer.current != null) window.clearTimeout(timer.current);
    setShown(null);
  };
  const enter = (index: number, word: string) => {
    if (timer.current != null) window.clearTimeout(timer.current);
    const mine = ++seq.current;
    timer.current = window.setTimeout(() => {
      setShown({ index, entry: null, loading: true });
      void lookupWord(word, lang).then((entry) => {
        if (seq.current === mine) setShown({ index, entry, loading: false });
      });
    }, HOVER_DELAY_MS);
  };

  const parts = line.split(/(\s+)/);
  return (
    <div>
      {parts.map((part, i) => {
        const word = cleanWord(part);
        if (!word || /^\s+$/.test(part)) return <span key={i}>{part}</span>;
        const open = shown?.index === i;
        return (
          <span
            key={i}
            className="pointer-events-auto relative cursor-help rounded-sm hover:bg-white/20"
            onMouseEnter={() => enter(i, part)}
            onMouseLeave={leave}
          >
            {part}
            {open && (
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full start-1/2 z-20 mb-2 w-max max-w-[320px] -translate-x-1/2 rounded-xl border border-white/15 bg-black/85 px-3 py-2 text-start text-[13px] font-normal leading-snug text-white shadow-xl backdrop-blur-xl rtl:translate-x-1/2"
                style={{ textShadow: "none", letterSpacing: "normal" }}
              >
                {shown.loading && <span className="text-white/60">{t("Looking up…")}</span>}
                {!shown.loading && !shown.entry && (
                  <span className="text-white/60">{t("No definition found for “{word}”.", { word })}</span>
                )}
                {shown.entry && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        {shown.entry.word}
                        {shown.entry.phonetic && (
                          <span className="ms-2 font-normal text-white/60">{shown.entry.phonetic}</span>
                        )}
                      </span>
                      {typeof window !== "undefined" && "speechSynthesis" in window && (
                        <button
                          type="button"
                          className="pointer-events-auto rounded p-0.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          title={t("Listen to pronunciation")}
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              const utterance = new SpeechSynthesisUtterance(shown.entry!.word);
                              utterance.lang = lang;
                              window.speechSynthesis.speak(utterance);
                            } catch {}
                          }}
                        >
                          🔊
                        </button>
                      )}
                    </div>
                    {shown.entry.meanings.map((m, k) => (
                      <span key={k} className="mt-1 block">
                        {m.partOfSpeech && <em className="me-1.5 text-white/55">{m.partOfSpeech}</em>}
                        {m.definition}
                      </span>
                    ))}
                  </>
                )}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
