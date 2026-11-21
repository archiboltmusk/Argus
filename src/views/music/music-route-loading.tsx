import { useT } from "@/lib/i18n";
import { MusicHomeHeroSkeleton } from "@/components/music/music-skeletons";

export function MusicRouteLoading() {
  const t = useT();
  return (
    <main
      data-music-view
      className="min-h-0 min-w-0 w-full flex-1 overflow-x-hidden px-5 pt-28 pb-14 text-ink bg-canvas sm:px-8 lg:px-12"
      aria-label={t("nav.music")}
    >
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 pb-24">
        <header className="music-page-mast flex min-w-0 flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-[32px] font-bold leading-tight tracking-tight text-ink sm:text-[38px]">
              {t("nav.music")}
            </h1>
          </div>
        </header>
        <div className="flex flex-col gap-8">
          <MusicHomeHeroSkeleton />
        </div>
      </div>
    </main>
  );
}
