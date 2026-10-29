export type NightOwlStatus = {
  isNightWindowActive: boolean;
  startsInMinutes: number;
  message: string;
};

/**
 * Checks if current local time is inside the Indian unlimited night data window
 * (typically 12:00 AM - 6:00 AM, widely used by Vi "Binge All Night", Airtel/Jio off-peak).
 */
export function getNightOwlWindowStatus(now: Date = new Date()): NightOwlStatus {
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Active between 00:00 and 06:00
  const isNightWindowActive = hours >= 0 && hours < 6;

  let startsInMinutes = 0;
  if (!isNightWindowActive) {
    // Minutes remaining until midnight (24:00)
    const minutesUntilMidnight = (23 - hours) * 60 + (60 - minutes);
    startsInMinutes = minutesUntilMidnight;
  }

  const hoursLeft = Math.floor(startsInMinutes / 60);
  const minsLeft = startsInMinutes % 60;

  const message = isNightWindowActive
    ? "🌙 Free Night Window Active (12 AM - 6 AM)"
    : `⏳ Scheduled: Starts in ${hoursLeft > 0 ? `${hoursLeft}h ` : ""}${minsLeft}m (at 12:00 AM)`;

  return {
    isNightWindowActive,
    startsInMinutes,
    message,
  };
}
