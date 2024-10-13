import { google } from "googleapis"
import { oAuth2Client } from "../support/google-auth.service"
import { startOfWeek } from "date-fns"
import { ObjectId } from 'mongodb';
import EventsDao from '@dao/events.dao';
import { Event } from '@/models/Event';

const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

export async function getGoogleEvents() {
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return response.data.items
}

export async function getEvents(filter: { start: Date; end: Date; calendarId?: ObjectId; categories?: string[] }) {
  return await EventsDao.getEvents(filter);
}

export async function createEvent(eventData: Event) {
  return await EventsDao.createEvent(eventData);
}

export async function updateEvent(eventId: ObjectId, updateData: Partial<Event>) {
  return await EventsDao.updateEvent(eventId, updateData);
}

export async function deleteEvent(eventId: ObjectId) {
  return await EventsDao.deleteEvent(eventId);
}

export async function getEventById(eventId: ObjectId) {
  return await EventsDao.getEventById(eventId);
}

export default {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
};
