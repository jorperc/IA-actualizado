/**
 * AI Weekly Radar - Schedule & Timezone Utilities
 */

const DAYS_OF_WEEK: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export function calculateNextRun(
  dayName: string,
  hour: number,
  minute: number = 0,
  timeZone: string = 'Europe/Madrid'
): string {
  try {
    const targetDayIndex = DAYS_OF_WEEK[dayName] ?? 1; // Default Monday (1)
    const now = new Date();

    // Get current day/time parts in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getVal = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const currentWeekday = getVal('weekday');
    const currentDayIndex = DAYS_OF_WEEK[currentWeekday] ?? now.getDay();
    const currentHour = parseInt(getVal('hour'), 10) || 0;
    const currentMinute = parseInt(getVal('minute'), 10) || 0;

    let daysUntilTarget = (targetDayIndex - currentDayIndex + 7) % 7;
    if (
      daysUntilTarget === 0 &&
      (currentHour > hour || (currentHour === hour && currentMinute >= minute))
    ) {
      daysUntilTarget = 7;
    }

    const nextDate = new Date(now.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);

    const displayFormatter = new Intl.DateTimeFormat('es-ES', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return displayFormatter.format(nextDate);
  } catch (err) {
    return `Próximo ${dayName} a las ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (${timeZone})`;
  }
}

export function getCurrentDatePeriod(timeZone: string = 'Europe/Madrid'): { from: string; to: string; full: string } {
  const now = new Date();
  const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const formatter = new Intl.DateTimeFormat('es-ES', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const from = formatter.format(past7Days);
  const to = formatter.format(now);

  return {
    from,
    to,
    full: `${from} – ${to}`,
  };
}
