import { calendar_v3, google } from "googleapis"
import { endOfWeek, startOfWeek } from "date-fns"
import { oAuth2Client } from "./google-auth.service"
import { Event, mapAppEventToGoogleEvent } from "@/entities/Event"
import logger from "@/common/logger"

export async function getEventsFromGoogleCalendar({
  calendarId = 'primary',
  showDeleted = false,
  maxResults = 250,
  fromDate,
  toDate,
}
  : { calendarId?: string, showDeleted?: boolean, maxResults?: number, fromDate?: Date, toDate?: Date }
): Promise<calendar_v3.Schema$Event[]> {
  if (!fromDate) {
    fromDate = startOfWeek(new Date(), { weekStartsOn: 1 })
  }

  if (!toDate) {
    toDate = endOfWeek(new Date(), { weekStartsOn: 1 })
  }

  const calendar = google.calendar({ version: "v3", auth: oAuth2Client })

  const response = await calendar.events.list({
    calendarId,
    timeMin: fromDate.toISOString(),
    timeMax: toDate.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
    showDeleted
  })

  return response.data.items
}

export async function addEventsToGoogleCalendar(events: Event[]) {
  const calendar = google.calendar({ version: "v3", auth: oAuth2Client })

  for (const calendarEvent of events.map(mapAppEventToGoogleEvent)) {
    try {
      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: calendarEvent
      })
    } catch (error) {
      logger.error(`Error adding event '${calendarEvent.summary}':`, error);
    }
  }
}
