import { enUS, vi, ja, zhCN } from 'date-fns/locale'
import { LangCode } from "../types/types";

export function removeTimeInfo(date: Date): Date {
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date
}

/**
 * Get the greeting string based on the current time. E.g. morning, afternoon, evening.
 * @param time: Date time to get the time period. Default to current time.
 * @return greeting string.
 */
export const getGreetingTime = (locale: LangCode, time?: Date) => {
  if (!time) time = new Date()

  const splitAfternoon = 12
  const splitEvening = 17
  const currentHour = time.getHours()

  if (currentHour >= splitAfternoon && currentHour <= splitEvening) {
    // Between 12 PM and 5PM
    switch (locale) {
      case 'en':
        return 'Good afternoon'

      case 'vi':
        return 'Buổi chiều vui vẻ'

      case 'zh':
        return '下午好'

      case 'ja':
        return 'こんにちは'

      default:
        return 'Good afternoon'
    }
  } else if (currentHour > splitEvening) {
    // Between 5PM and Midnight
    switch (locale) {
      case 'en':
        return 'Good evening'

      case 'vi':
        return 'Buổi tối vui vẻ'

      case 'zh':
        return '晚上好'

      case 'ja':
        return 'こんばんは'

      default:
        return 'Good evening'
    }
  }
  // Between dawn and noon
  switch (locale) {
    case 'en':
      return 'Good morning'

    case 'vi':
      return 'Buổi sáng vui vẻ'

    case 'zh':
      return '早上好'

    case 'ja':
      return 'おはよう'

    default:
      return 'Good morning'
  }
}

export function formatString(template: string, args?: string[]): string {
  return template.replace(/:\d+/g, (match) => {
    const index = parseInt(match.substring(1))
    return args[index] ?? match;
  })
}

export const tryParseJson = <T>(json: string, fallback: any = {}): T => {
  try {
    return JSON.parse(json) as T
  } catch (e) {
    return fallback
  }
}

export function extractJsonFromMessage<T>(input: string): T | null {
  const jsonMatch = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ?? input.match(/^[\s\S]*$/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[1]);
  } catch (e) {
    return null;
  }
}

export const langCodeToDateFnsLocale = (code: string | undefined) => {
  switch (code) {
    case "en":
      return enUS

    case "vi":
      return vi

    case "ja":
      return ja

    case "zh":
      return zhCN

    default:
      return enUS
  }
}