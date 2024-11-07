import { differenceInYears, endOfWeek, format, formatDuration, intervalToDuration, startOfWeek, subWeeks } from 'date-fns'
import { DefaultLangCode, LiteralDurationsExtractRegex, i18n } from "@/common/consts/constants"
import { langCodeToDateFnsLocale } from './stringUtils'
import { WeekInfo } from '@/common/types/types'
import { toZonedTime } from 'date-fns-tz'

export function getYesterday() {
  return new Date(new Date().setDate(new Date().getDate() - 1))
}

/**
 * Get the start date of last week.
 * @returns {Date} Start date of last week.
 */
export const getLastWeekStart = (): Date => {
  return startOfWeek(subWeeks(new Date(), 1));
};

/**
 * Get the end date of last week.
 * @returns {Date} End date of last week.
 */
export const getLastWeekEnd = (): Date => {
  return endOfWeek(subWeeks(new Date(), 1));
};

export function dateDiffReadable(toDate: Date, fromDate?: Date, locale: string = DefaultLangCode) {
  if (!fromDate) fromDate = new Date()

  toDate.setHours(0, 0, 0, 0)
  fromDate.setHours(0, 0, 0, 0)

  return formatDuration(intervalToDuration({
    start: fromDate,
    end: toDate,
  }), {
    locale: langCodeToDateFnsLocale(locale)
  })
}

/**
 * Return the date after the specified date adding the specified duration.
 * @param duration Duration in literal string format, support d, h, s in that order, e.g. 7d.
 */
export const addDuration = (date: Date, duration: string): Date => {
  const groups = LiteralDurationsExtractRegex.exec(duration)?.groups

  const days: number = parseInt(groups?.days || "0")
  const hours: number = parseInt(groups?.hours || "0")
  const minutes: number = parseInt(groups?.minutes || "0")
  const seconds: number = parseInt(groups?.seconds || "0")

  let result = new Date(date)
  result.setSeconds(result.getSeconds() + days * 86400 + hours * 3600 + minutes * 60 + seconds)

  return result
}

export function formatDurationFromMs(milliseconds: number, options?: {
  includeHour?: boolean,
  includeMinute?: boolean,
  includeSecond?: boolean,
}): string {
  const defaultOptions = {
    includeHour: true,
    includeMinute: true,
    includeSecond: false,
  }

  options = {
    ...defaultOptions,
    ...options || {},
  }

  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  let formattedTime = ''

  if (hours > 0 && options.includeHour) {
    formattedTime += `${hours} ${hours === 1 ? i18n("common_hour") : i18n("common_hours") || i18n("common_hour")}`
  }

  if (minutes > 0 && options.includeMinute) {
    if (formattedTime) formattedTime += ', '
    formattedTime += `${minutes} ${minutes === 1 ? i18n("common_minute") : i18n("common_minutes") || i18n("common_minute")}`
  }

  if ((seconds > 0 || !formattedTime) && options.includeSecond) {
    if (formattedTime) formattedTime += ', '
    formattedTime += `${seconds} ${seconds === 1 ? i18n("common_second") : i18n("common_seconds") || i18n("common_second")}`
  }

  return formattedTime || i18n("common_few_seconds")
}

export function getWeekInfo(dateInTheWeek: Date, startOnMonday: boolean = true, endDateEndOfDay: boolean = true): WeekInfo {
  const dayOffset = startOnMonday ? (dateInTheWeek.getDay() + 6) % 7 : dateInTheWeek.getDay();
  const weekStartDate = new Date(dateInTheWeek.getFullYear(), dateInTheWeek.getMonth(), dateInTheWeek.getDate() - dayOffset);
  const weekEndDate = new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);
  if (endDateEndOfDay) {
    weekEndDate.setHours(23, 59, 59, 999);
  }

  const weekNumber = Math.ceil(
    (weekStartDate.getTime() - new Date(weekStartDate.getFullYear(), 0, 1).getTime() + 1) /
    (24 * 60 * 60 * 1000 * 7)
  );

  return {
    weekNumber,
    weekStartDate,
    weekEndDate,
  }
}

export function formatDateToWeekDayAndTime(date: Date, timeZone?: string, longDay: boolean = false): string {
  if (!timeZone) return format(date, longDay ? "EEEE, HH:mm" : "EEE, HH:mm") + " (UTC)"

  const zonedDate = toZonedTime(date, timeZone)
  return format(zonedDate, longDay ? "EEEE, HH:mm" : "EEE, HH:mm")
}

export function formatDateToWeekDayAndDate(date: Date, timeZone?: string, longDay: boolean = false): string {
  if (!timeZone) return format(date, longDay ? "EEEE, MMMM do yyyy" : "EEE, MMMM do yyyy") + " (UTC)"

  const zonedDate = toZonedTime(date, timeZone)
  return format(zonedDate, longDay ? "EEEE, MMMM do yyyy" : "EEE, MMMM do yyyy")
}

export function getAge(dob: Date): number {
  return differenceInYears(new Date(), dob)
}