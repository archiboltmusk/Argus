import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    } else if (typeof (mq as { addListener?: (cb: () => void) => void }).addListener === "function") {
      (mq as { addListener: (cb: () => void) => void }).addListener(on);
      return () => (mq as { removeListener: (cb: () => void) => void }).removeListener(on);
    }
  }, []);
  return reduce;
}
