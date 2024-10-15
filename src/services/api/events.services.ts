import { ObjectId } from 'mongodb'
import EventsDao from '@dao/events.dao'
import { Event } from '@/entities/Event'

export async function getEvents(filter: { start: Date; end: Date; calendarId?: ObjectId; categories?: string[] }) {
  return await EventsDao.getEvents(filter);
}

export async function createEvent(eventData: Event) {
  return await EventsDao.createEvent(eventData);
}

export async function createMultipleEvents(eventsData: Event[]) {
  return await EventsDao.createMultipleEvents(eventsData);
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
