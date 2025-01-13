import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

// Constants for supported languages
const SUPPORTED_LANGUAGES: Record<string, string> = {
  English: 'en',
  Français: 'fr',
};

/**
 * Get a localized date string formatted according to the specified language.
 *
 * @param dateString - The date string to format (ISO format recommended)
 * @param language - The language for localization (e.g., "English", "French")
 * @returns A formatted date string
 */
export function getLocalizedDateString(dateString: string, language: string): string {
  const locale = SUPPORTED_LANGUAGES[language] ?? 'en';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Create a Day.js object in a specific timezone.
 *
 * @param dateString - The date string in ISO format
 * @param timeZone - The timezone (e.g., "Europe/Paris")
 */
export const createDateInSpecialTimeZone = (dateString: string, timeZone: string) =>
  dayjs.tz(dateString, timeZone);
