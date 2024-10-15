import { google } from "googleapis"
import { startOfWeek } from "date-fns"
import { oAuth2Client } from "../support/google-auth.service"

import { Event } from "@/entities/Event"
import { AppDomain, AppName, CalendarSourceGoogle } from "@/common/consts";

export async function getEventsFromGoogleCalendar(): Promise<Event[]> {
  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items.map(event => ({
    source: CalendarSourceGoogle,
    title: event.summary,
    description: event.description,
    startDate: new Date(event.start.dateTime),
    endDate: new Date(event.end.dateTime),
    allDayEvent: event.start.dateTime.split('T')[0] === event.end.dateTime.split('T')[0],
    location: event.location,
    reminders: event.reminders?.overrides?.map(reminder => ({
      type: reminder.method,
      time: reminder.minutes * 60000
    })),
    attendees: event.attendees?.map(attendee => ({
      email: attendee.email,
      name: attendee.displayName
    })),
    categories: [], // TODO: Extract categories from event details
    taskIds: [], // TODO: Fetch related tasks
    objectiveIds: [], // TODO: Fetch related objectives
    meta: {
      etag: event.etag
    }
  } as Event));
}

export async function addEventsToGoogleCalendar(events: Event[]) {
  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  for (const event of events) {
    const calendarEvent = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startDate.toISOString(),
        timeZone: 'Asia/Singapore'
      },
      end: {
        dateTime: event.endDate.toISOString(),
        timeZone: 'Asia/Singapore'
      },
      attendees: event.attendees?.map(attendee => ({ email: attendee.email })),
      reminders: {
        useDefault: false,
        overrides: event.reminders?.map(reminder => ({
          method: reminder.type,
          minutes: reminder.time / 60000
        })) || []
      },
      status: 'confirmed',
      source: {
        title: `${AppName} task`,
        url: AppDomain
      }
    };

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
