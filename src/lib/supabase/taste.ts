import { SUPABASE } from "@/lib/config/supabase";
import { currentTasteForSync, mergeCloudTaste } from "@/lib/discover/taste-sync";
import { mergeTaste, normalizeTaste } from "@/lib/discover/taste-profile";
import { supabaseSession } from "./account";

function headers(): HeadersInit {
  const session = supabaseSession();
  if (!SUPABASE || !session) throw new Error("Sign in to cloud sync first.");
  return { apikey: SUPABASE.key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

/** Pull then merge then write; only the bounded aggregate profile ever leaves this device. */
export async function syncSupabaseTaste(): Promise<void> {
  const session = supabaseSession();
  if (!SUPABASE || !session) return;
  const base = `${SUPABASE.url}/rest/v1/argus_taste_profiles`;
  const read = await fetch(`${base}?user_id=eq.${encodeURIComponent(session.user.id)}&select=taste&limit=1`, { headers: headers() });
  if (!read.ok) throw new Error("Could not read cloud taste profile.");
  const rows = await read.json() as Array<{ taste?: unknown }>;
  const taste = mergeTaste(currentTasteForSync(), normalizeTaste(rows[0]?.taste));
  mergeCloudTaste(taste);
  const write = await fetch(`${base}?on_conflict=user_id`, {
    method: "POST", headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: session.user.id, version: 1, taste }),
  });
  if (!write.ok) throw new Error("Could not save cloud taste profile.");
}
