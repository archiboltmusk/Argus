import { ArgusEyeLoader } from "./argus-eye-loader";
import { CustomArtwork } from "./custom-artwork";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<Size, string> = {
  xs: "h-7 w-7",
  sm: "h-20 w-20",
  md: "h-32 w-32",
  lg: "h-44 w-44",
  xl: "h-60 w-60",
};

export function ArgusLoader({
  size = "md",
  caption,
  className = "",
  keyed = false,
  logos,
  original = false,
}: {
  size?: Size;
  caption?: string;
  className?: string;
  keyed?: boolean;
  logos?: string[];
  original?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      {original ? <Eye size={size} keyed={keyed} logos={logos} /> : <CustomArtwork role="loading" className={`argus-loader-art ${SIZE_CLASS[size]}`} fallback={<Eye size={size} keyed={keyed} logos={logos} />} />}
      {caption && <p className="argus-loader-cap mt-1 text-[12.5px] font-medium uppercase tracking-[0.18em] text-white/70">{caption}</p>}
    </div>
  );
}

function Eye({ size }: { size: Size; keyed: boolean; logos?: string[] }) {
  return <ArgusEyeLoader className={`argus-loader-art text-ink ${SIZE_CLASS[size]}`} />;
}
