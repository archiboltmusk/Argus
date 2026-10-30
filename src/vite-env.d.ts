/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __IS_BETA_BUILD__: boolean;
declare const __BUILD_ID__: string;
declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_ARGUS_API_BASE?: string;
  readonly VITE_ARGUS_BUGS_BASE?: string;
  readonly VITE_ARGUS_SYNC_BASE?: string;
  readonly VITE_ARGUS_RELAY_BASE?: string;
  readonly VITE_ARGUS_TRAKT_BASE?: string;
  readonly VITE_ARGUS_MAL_BASE?: string;
  readonly VITE_ARGUS_TVDB_BASE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface Window {
  __argusStremioDeeplink?: boolean;
  __argusInstallerOpen?: boolean;
}
