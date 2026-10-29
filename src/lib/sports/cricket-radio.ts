export type CricketRadioFeed = {
  id: string;
  name: string;
  language: string;
  badge: string;
  streamUrl: string;
  description: string;
};

export const POPULAR_INDIAN_CRICKET_RADIOS: CricketRadioFeed[] = [
  {
    id: "air-sports",
    name: "All India Radio Sports",
    language: "Hindi / English",
    badge: "AIR",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8",
    description: "Official Prasar Bharati national sports commentary & ball-by-ball updates",
  },
  {
    id: "sports-flashes-hindi",
    name: "Sports Flashes Cricket",
    language: "Hindi",
    badge: "SF",
    streamUrl: "https://stream.zeno.fm/4wv9u6w21v8uv",
    description: "24x7 live cricket commentary, expert analysis, and dugout reactions in Hindi",
  },
  {
    id: "bbc-tms",
    name: "BBC Test Match Special",
    language: "English",
    badge: "BBC",
    streamUrl: "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_five_live_sports_extra",
    description: "Iconic international cricket ball-by-ball commentary and analysis",
  },
  {
    id: "air-bangla",
    name: "Akashvani Kolkata / Bangla",
    language: "Bengali",
    badge: "AK",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio028/playlist.m3u8",
    description: "Regional Bengali commentary, sports updates, and Purulia/Kolkata broadcast",
  },
];
