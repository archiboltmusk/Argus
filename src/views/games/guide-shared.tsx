import { ArrowUpRight, Radio, Video as VideoIcon } from "lucide-react";
import type { ReactNode } from "react";
import { openUrl } from "@/lib/window";
import type { GameGuide } from "@/lib/games/guides-data";
export const guideSourceName=(item:GameGuide)=>({steam:"Steam Community",pcwiki:"PCGamingWiki",bulbapedia:"Bulbapedia",youtube:"YouTube",kick:"Kick",twitch:"Radio"})[item.source];
export function GuideSourceLink({href,children}:{href:string;children:ReactNode}) {
  return <a href={href} onClick={event=>{event.preventDefault();event.stopPropagation();void openUrl(href);}}>{children}<ArrowUpRight size={15}/></a>;
}
export function GuideProviderMark({provider}:{provider:"youtube"|"twitch"|"kick"}) {
  return provider==="youtube"?<VideoIcon size={18} aria-hidden/>:provider==="twitch"?<Radio size={18} aria-hidden/>:<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3 3h6v6h3V6h3V3h6v6h-3v3h-3v3h3v3h3v3h-6v-3h-3v-3H9v6H3z"/></svg>;
}
