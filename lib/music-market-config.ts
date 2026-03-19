export const MARKET_QUOTE_REFRESH_MINUTES = 10;
export const MARKET_SONG_ROTATION_HOURS = 2;
export const MARKET_TIME_ZONE = "America/New_York";

function roundToMinute(date: Date) {
  return new Date(Math.floor(date.getTime() / 60000) * 60000);
}

export function getNextMarketQuoteRefresh(now = new Date()) {
  const currentMinute = now.getUTCMinutes();
  const remainder = currentMinute % MARKET_QUOTE_REFRESH_MINUTES;
  const minutesToAdd = remainder === 0 ? MARKET_QUOTE_REFRESH_MINUTES : MARKET_QUOTE_REFRESH_MINUTES - remainder;
  return roundToMinute(new Date(now.getTime() + minutesToAdd * 60000));
}

export function getMarketQuoteWindow(now = new Date()) {
  const minutes = now.getUTCMinutes();
  const bucketMinute = Math.floor(minutes / MARKET_QUOTE_REFRESH_MINUTES) * MARKET_QUOTE_REFRESH_MINUTES;
  const windowStart = new Date(now);
  windowStart.setUTCMinutes(bucketMinute, 0, 0);

  return {
    startedAt: windowStart.toISOString(),
    nextRefreshAt: getNextMarketQuoteRefresh(now).toISOString(),
  };
}

export function getNextSongRotation(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const start = roundToMinute(now);
  for (let minuteOffset = 1; minuteOffset <= MARKET_SONG_ROTATION_HOURS * 60 + 5; minuteOffset += 1) {
    const candidate = new Date(start.getTime() + minuteOffset * 60000);
    const parts = Object.fromEntries(formatter.formatToParts(candidate).map((part) => [part.type, part.value]));
    const localHour = Number(parts.hour ?? "0");
    const localMinute = Number(parts.minute ?? "0");

    if (localMinute === 0 && localHour % MARKET_SONG_ROTATION_HOURS === 0) {
      return candidate.toISOString();
    }
  }

  return new Date(start.getTime() + MARKET_SONG_ROTATION_HOURS * 60 * 60000).toISOString();
}
