import { google } from "googleapis"
import { oAuth2Client } from "../support/google-auth.service";

const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

export async function getEvents() {
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return response.data.items
}

export default {
  getEvents,
}
