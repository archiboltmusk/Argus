import { createMediaListStore } from "./media-list-store";

export type { MediaEntry, MediaInput, MediaListStore } from "./media-list-store";

const store = createMediaListStore("argus.favorites.v1.");

export const MediaFavoritesProvider = store.Provider;
export const useMediaFavorites = store.useStore;
export const useIsFavorite = store.useIn;
export const removeMediaFavorites = store.removeData;
