import { useEffect } from "react";
import { useProfiles } from "./profiles";
import { useSettings, type ContentFilters } from "./settings";
import { DEFAULT } from "./settings/defaults";
import { useTogether } from "./together/provider";

function sameHideContent(a: ContentFilters, b: ContentFilters): boolean {
  return (
    a.anime === b.anime &&
    a.liveTv === b.liveTv &&
    a.sports === b.sports &&
    a.adult === b.adult &&
    a.manga === b.manga
  );
}

export function ProfileIdentitySync() {
  const { activeProfile } = useProfiles();
  const { settings, update } = useSettings();
  const { displayName, setDisplayName } = useTogether();

  useEffect(() => {
    if (!activeProfile || activeProfile.kid) return;
    if (settings.argusColor !== activeProfile.color) {
      update({ argusColor: activeProfile.color });
    }
  }, [activeProfile?.id, activeProfile?.color]);

  useEffect(() => {
    if (!activeProfile || activeProfile.kid) return;
    if (settings.argusAvatar !== activeProfile.avatar) {
      update({ argusAvatar: activeProfile.avatar });
    }
  }, [activeProfile?.id, activeProfile?.avatar]);

  useEffect(() => {
    if (!activeProfile || activeProfile.kid) return;
    if (activeProfile.name && displayName !== activeProfile.name) {
      setDisplayName(activeProfile.name);
    }
  }, [activeProfile?.id, activeProfile?.name]);

  useEffect(() => {
    if (!activeProfile?.hideContent) return;
    const profileFilters = { ...DEFAULT.hideContent, ...activeProfile.hideContent };
    if (!sameHideContent(settings.hideContent, profileFilters)) {
      update({ hideContent: profileFilters });
    }
  }, [activeProfile?.id, activeProfile?.hideContent]);

  return null;
}
