import { google } from "googleapis"
import { oAuth2Client } from "../support/google-auth.service"
import { startOfWeek } from "date-fns"

const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

export async function getEvents() {
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return response.data.items
}

export default {
  getEvents,
}
