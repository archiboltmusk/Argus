import { SUPABASE } from "@/lib/config/supabase";

export type SupabaseSession = { access_token: string; refresh_token: string; user: { id: string; email?: string } };

const KEY = "argus.supabase.session.v1";
const listeners = new Set<() => void>();

function read(): SupabaseSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as SupabaseSession | null;
    return value?.access_token && value?.user?.id ? value : null;
  } catch { return null; }
}

let current = read();
export function supabaseSession(): SupabaseSession | null { return current; }
export function subscribeSupabaseSession(listener: () => void): () => void {
  listeners.add(listener); return () => listeners.delete(listener);
}
function set(session: SupabaseSession | null): void {
  current = session;
  try { session ? localStorage.setItem(KEY, JSON.stringify(session)) : localStorage.removeItem(KEY); } catch {}
  listeners.forEach((listener) => listener());
}

async function request(path: string, init: RequestInit): Promise<Response> {
  if (!SUPABASE) throw new Error("Cloud sync has not been configured.");
  const response = await fetch(`${SUPABASE.url}${path}`, {
    ...init,
    headers: { apikey: SUPABASE.key, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { msg?: string; message?: string } | null;
    throw new Error(body?.msg || body?.message || "Cloud account request failed.");
  }
  return response;
}

export async function signInSupabase(email: string, password: string): Promise<void> {
  const response = await request("/auth/v1/token?grant_type=password", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  set(await response.json() as SupabaseSession);
}

export async function signUpSupabase(email: string, password: string): Promise<boolean> {
  const response = await request("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password }) });
  const result = await response.json() as { access_token?: string; refresh_token?: string; user?: SupabaseSession["user"] };
  if (result.access_token && result.refresh_token && result.user) set(result as SupabaseSession);
  return !!result.access_token;
}

export function signOutSupabase(): void { set(null); }
