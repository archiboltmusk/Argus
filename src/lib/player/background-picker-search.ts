let active: { traceId: string; cancel: () => void } | null = null;

export function keepPickerSearch(traceId: string, controller: AbortController): void {
  active?.cancel();
  const timer = setTimeout(() => controller.abort(), 5000);
  const entry = { traceId, cancel: () => controller.abort() };
  active = entry;
  controller.signal.addEventListener(
    "abort",
    () => {
      clearTimeout(timer);
      if (active === entry) active = null;
    },
    { once: true },
  );
}

export function cancelPickerSearch(traceId?: string): void {
  if (traceId && active?.traceId === traceId) active.cancel();
}
