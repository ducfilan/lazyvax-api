import { getEvents } from '@/services/api/events.services';
import { addWeeks } from 'date-fns';
import { getWeekInfo, formatDateToWeekDayAndTime } from '@/common/utils/dateUtils';
import { ObjectId } from 'mongodb';
import { DaysOfWeekMap } from '@/common/consts/constants';
import { getHabits } from '@/services/api/habits.services';
import { EventStatusToTextEn } from '@/entities/Event';
import logger from '@/common/logger';
import { GeneralMessageMemorizeInfo, GeneralMessageMemory } from '@/common/types/types';
import { ModelNameChatGPT4oMini } from './model_repo';
import { getModel } from './model_repo';
import { deduplicateMemoryPrompt } from './prompts';
import { extractJsonFromMessage } from '@/common/utils/stringUtils';
import { updateAiMemory } from '@/services/api/users.services';
import { User } from '@/entities/User';
import { updateConversationMemory } from '@/services/api/conversation_memories.services';

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
    const status = typeof e.status === 'number' ? ` - status: ${EventStatusToTextEn[e.status]}` : '';
    return `${startTime} to ${endTime}: ${e.title}${description}${status}`;
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
    const status = typeof e.status === 'number' ? ` - status: ${EventStatusToTextEn[e.status]}` : '';

    return `${startTime} to ${endTime}: ${e.title}${description}${status}`;
  }) ?? [];
}

export async function saveMemorizeInfo(user: User, conversationId: ObjectId, dayIndex: number, currentMemory: GeneralMessageMemory, newMemory: GeneralMessageMemorizeInfo) {
  logger.debug('saveMemorizeInfo')
  const prompt = deduplicateMemoryPrompt(currentMemory, newMemory)

  const deduplicatedMemoryResponse = await getModel(ModelNameChatGPT4oMini)
    .invoke(prompt)

  const updatedMemory = extractJsonFromMessage<GeneralMessageMemory>(deduplicatedMemoryResponse.content as string)

  if (!updatedMemory) {
    throw new Error('Failed to deduplicate memory')
  }

  const { longTermMemory, weeklyMemory, dailyMemory } = updatedMemory
  await Promise.all([
    updateAiMemory(user, longTermMemory),
    updateConversationMemory({ conversationId }, {
      $set: {
        'meta.weekAiMemory': weeklyMemory,
        [`meta.dayAiMemory.${dayIndex}`]: dailyMemory
      }
    })
  ])

  return updatedMemory
}
