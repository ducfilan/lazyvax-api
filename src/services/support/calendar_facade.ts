import { google } from "googleapis"
import { startOfWeek } from "date-fns"
import { oAuth2Client } from "./google-auth.service"

import { Event, mapGoogleEventToAppEvent } from "@/entities/Event"
import { AppDomain, AppName } from "@/common/consts";

export async function getEventsFromGoogleCalendar(): Promise<Event[]> {
  const calendar = google.calendar({ version: "v3", auth: oAuth2Client })

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return response.data.items.map(mapGoogleEventToAppEvent)
}

export async function addEventsToGoogleCalendar(events: Event[]) {
  const calendar = google.calendar({ version: "v3", auth: oAuth2Client })

  for (const event of events) {
    const calendarEvent = {
      id: event._id.toHexString(),
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startDate.toISOString(),
        timeZone: 'Asia/Singapore' // TODO: Set user's city timezone dynamically.
      },
      end: {
        dateTime: event.endDate.toISOString(),
        timeZone: 'Asia/Singapore'
      },
      attendees: event.attendees?.map(attendee => ({ email: attendee.email, responseStatus: 'accepted' })),
      reminders: {
        useDefault: false,
        overrides: event.reminders?.map(reminder => ({
          method: reminder.type,
          minutes: reminder.time / 60000
        })) || []
      },
      source: {
        title: `${AppName} task`,
        url: AppDomain
      },
      extendedProperties: {
        private: {
          appEventId: event._id.toString(),
        },
      },
    }

    try {
      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: calendarEvent
      });
      console.log(`Event '${event.title}' added to Google Calendar.`);
    } catch (error) {
      console.error(`Error adding event '${event.title}':`, error);
    }
  }
}
