import { useAuth } from "@/lib/auth";
import { useProfiles } from "@/lib/profiles";
import { useSettings } from "@/lib/settings";

export function useSelfIdentity(): { avatar: string | null; color: string | null } {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { activeProfile } = useProfiles();
  return {
    avatar: activeProfile?.avatar ?? settings.argusAvatar ?? user?.avatar ?? null,
    color: settings.argusColor || activeProfile?.color || null,
  };
}
