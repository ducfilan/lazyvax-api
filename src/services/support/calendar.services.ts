import { google } from "googleapis"
import { oAuth2Client } from "../support/google-auth.service"

import { Event } from "@/entities/Event";

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
