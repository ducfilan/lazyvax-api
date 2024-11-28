import { getEvents } from '@/services/api/events.services';
import { addWeeks } from 'date-fns';
import { getWeekInfo, formatDateToWeekDayAndTime } from '@/common/utils/dateUtils';
import { ObjectId } from 'mongodb';
import { DaysOfWeekMap } from '@/common/consts/constants';
import { getHabits } from '@/services/api/habits.services';
import { EventStatusToText } from '@/entities/Event';

export async function getLastWeekPlan(userId: ObjectId, dayStartDate: Date, timezone?: string): Promise<string[]> {
  const lastWeekInfo = getWeekInfo(addWeeks(dayStartDate, -1), timezone);
  const lastWeekEvents = await getEvents({
    userId: userId,
    from: lastWeekInfo.weekStartDate,
    to: lastWeekInfo.weekEndDate,
  });

  return lastWeekEvents?.map(e => {
    const startTime = formatDateToWeekDayAndTime(e.startDate, timezone);
    const endTime = formatDateToWeekDayAndTime(e.endDate, timezone);
    const description = e.description ? ` (${e.description})` : '';
    return `${startTime} to ${endTime}: ${e.title}${description}`;
  }) ?? [];
}

export async function getRoutineAndHabits(userId: ObjectId): Promise<string[]> {
  const habits = await getHabits({ userId });

  return habits?.map(h => {
    const daysOfWeek = h.repeat.daysOfWeek ? `on ${h.repeat.daysOfWeek?.map(d => DaysOfWeekMap[d]).join(', ')}` : '';
    if (h.startTime && h.endTime) {
      return `${h.title} - priority: ${h.priority} - every ${h.repeat.unit} ${h.repeat.frequency} times ${daysOfWeek} from ${h.startTime} to ${h.endTime}`;
    }
    return `${h.title} - priority: ${h.priority} - every ${h.repeat.unit} ${h.repeat.frequency} times ${daysOfWeek}`;
  }) ?? [];
}

export async function getCalendarEvents(userId: ObjectId, from: Date, to: Date, timezone?: string): Promise<string[]> {
  const calendarEvents = await getEvents({
    userId: userId,
    from,
    to,
  }, { "startDate": 1 });

  return calendarEvents?.map(e => {
    const startTime = formatDateToWeekDayAndTime(e.startDate, timezone);
    const endTime = formatDateToWeekDayAndTime(e.endDate, timezone);
    const description = e.description ? ` (${e.description})` : '';
    const status = e.status ? ` - status: ${EventStatusToText[e.status]}` : '';

    return `${startTime} to ${endTime}: ${e.title}${description}${status}`;
  }) ?? [];
}
