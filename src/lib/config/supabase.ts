function readUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

const url = readUrl(import.meta.env.VITE_SUPABASE_URL);
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || null;

/** Public browser configuration only. Never put service-role credentials in Vite env. */
export const SUPABASE = url && key ? { url, key } : null;
