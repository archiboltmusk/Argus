import { usePageVisible } from "@/lib/visibility";
import { ArgusSocialArt } from "./argus-social-art";
import "./argus-social-cover.css";

export function ArgusSocialCover({ active = true }: { active?: boolean }) {
  const visible = usePageVisible();
  return (
    <div
      className="argus-social-cover mx-6 mt-4 aspect-[1005/405] shrink-0 overflow-hidden rounded-xl border border-edge-soft bg-canvas"
      aria-hidden="true"
      data-active={active}
      data-paused={!visible}
    >
      <ArgusSocialArt />
    </div>
  );
}
