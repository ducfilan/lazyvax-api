import { differenceInYears, endOfDay, endOfWeek, format, formatDuration, getISOWeek, intervalToDuration, startOfDay, startOfWeek, subWeeks } from 'date-fns'
import { DefaultLangCode, LiteralDurationsExtractRegex, i18n } from "@/common/consts/constants"
import { langCodeToDateFnsLocale } from './stringUtils'
import { WeekInfo } from '@/common/types/types'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { daysInWeek } from 'date-fns/constants'

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

export function getWeekInfo(dateInTheWeek: Date, timeZone?: string, startOnMonday: boolean = true): WeekInfo {
  if (timeZone) {
    dateInTheWeek = toZonedTime(dateInTheWeek, timeZone)
  }

  let weekStartDate = startOfWeek(dateInTheWeek, { weekStartsOn: startOnMonday ? 1 : 0 })
  let weekEndDate = endOfWeek(dateInTheWeek, { weekStartsOn: startOnMonday ? 1 : 0 })

  const weekNumber = getISOWeek(weekStartDate)

  if (timeZone) {
    weekStartDate = fromZonedTime(weekStartDate, timeZone)
    weekEndDate = fromZonedTime(weekEndDate, timeZone)
  }

  return {
    weekNumber,
    weekStartDate,
    weekEndDate,
  }
}

export function startOfDayInTimeZone(date: Date, timeZone?: string): Date {
  if (!timeZone) return startOfDay(date)

  return startOfDay(toZonedTime(date, timeZone))
}

export function endOfDayInTimeZone(date: Date, timeZone?: string): Date {
  if (!timeZone) return endOfDay(date)

  return endOfDay(toZonedTime(date, timeZone))
}

export function formatDateToWeekDayAndTime(date: Date, timeZone?: string, longDay: boolean = false): string {
  if (!timeZone) return format(date, longDay ? "EEEE, HH:mm" : "EEE, HH:mm")

  const zonedDate = toZonedTime(date, timeZone)
  return format(zonedDate, longDay ? "EEEE, HH:mm" : "EEE, HH:mm")
}

export function formatDateToWeekDayAndDateTime(date: Date, timeZone?: string, longDay: boolean = false): string {
  if (!timeZone) return format(date, longDay ? "EEEE, MMMM do yyyy HH:mm" : "EEE, MMMM do yyyy HH:mm")

  const zonedDate = toZonedTime(date, timeZone)
  return format(zonedDate, longDay ? "EEEE, MMMM do yyyy HH:mm" : "EEE, MMMM do yyyy HH:mm")
}

export function formatDateToWeekDayAndDate(date: Date, timeZone?: string, longDay: boolean = false): string {
  if (!timeZone) return format(date, longDay ? "EEEE, MMMM do yyyy" : "EEE, MMMM do yyyy")

  const zonedDate = toZonedTime(date, timeZone)
  return format(zonedDate, longDay ? "EEEE, MMMM do yyyy" : "EEE, MMMM do yyyy")
}

export function formatDateToWeekDay(date: Date, timeZone?: string, longDay: boolean = true): string {
  if (!timeZone) return format(date, longDay ? "EEEE" : "EEE")

  const zonedDate = toZonedTime(date, timeZone)
  return format(zonedDate, longDay ? "EEEE" : "EEE")
}

export function getAge(dob: Date): number {
  return differenceInYears(new Date(), dob)
}

export function isEvening(date?: Date, timeZone?: string): boolean {
  if (!date) date = new Date()

  const zonedDate = timeZone ? toZonedTime(date, timeZone) : date
  const hour = zonedDate.getHours()
  return hour >= 17
}

export function dateInTimeZone(date: Date, timeZone?: string): Date {
  if (!timeZone) return date

  return toZonedTime(date, timeZone)
}
