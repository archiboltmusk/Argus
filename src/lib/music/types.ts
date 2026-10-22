export type Track = {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  trackNo: number;
  discNo: number;
  year: number;
  genre: string;
  durationMs: number;
  ext: string;
  hasLyrics: boolean;
  size: number;
  mtime: number;
};

export type Album = {
  key: string;
  title: string;
  artist: string;
  year: number;
  tracks: Track[];
  durationMs: number;
};

export type Artist = {
  name: string;
  albums: Album[];
  trackCount: number;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type LyricLine = { time: number | null; text: string };
