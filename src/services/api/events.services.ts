import { ObjectId } from 'mongodb'
import EventsDao from '@dao/events.dao'
import { Event, GoogleCalendarMeta, mapGoogleEventToAppEvent } from '@/entities/Event'
import { google } from 'googleapis'
import { oAuth2Client } from '../support/google-auth.service'
import { CalendarSourceGoogle } from '@/common/consts'
import { getEventsFromGoogleCalendar } from '../support/calendar_facade'

export async function getEvents(filter: { start: Date; end: Date; calendarId?: ObjectId; categories?: string[] }) {
  return await EventsDao.getEvents(filter)
}

export async function createEvent(eventData: Event) {
  return await EventsDao.createEvent(eventData)
}

export async function createMultipleEvents(eventsData: Event[]) {
  return await EventsDao.createMultipleEvents(eventsData)
}

export async function updateEvent(eventId: ObjectId, updateData: Partial<Event>) {
  return await EventsDao.updateEvent(eventId, updateData)
}

export async function deleteEvent(eventId: ObjectId) {
  return await EventsDao.deleteEvent(eventId)
}

export async function getEventById(eventId: ObjectId) {
  return await EventsDao.getEventById(eventId)
}

async function syncEventsFromGoogle(userId: ObjectId, from: Date, to: Date, googleCalendarId: string = "primary") {
  const insertOps = []
  const updateOps = []
  const deleteOps = []

  const googleEventsInApp = await getEventsBySource(CalendarSourceGoogle, from, to)
  const googleEventIdToGoogleEventInApp = new Map<string, Event>()
  googleEventsInApp.forEach(appEvent => {
    const meta = appEvent.meta as GoogleCalendarMeta
    if (meta?.id) {
      googleEventIdToGoogleEventInApp.set(meta.id, appEvent)
    }
  })

  const googleEvents = await getEventsFromGoogleCalendar({ calendarId: googleCalendarId, showDeleted: true })

  googleEvents.forEach((googleEvent) => {
    const isEventOriginallyFromApp = googleEvent.extendedProperties.private.hasOwnProperty("appEventId")
    if (isEventOriginallyFromApp) return false

    const eventInApp = googleEventIdToGoogleEventInApp.get(googleEvent.id)

    if (!eventInApp) {
      insertOps.push({
        insertOne: {
          document: mapGoogleEventToAppEvent(userId, googleEvent),
        },
      })
    } else if (googleEvent.etag && (eventInApp.meta as GoogleCalendarMeta)?.etag != googleEvent?.etag) {
      updateOps.push({
        updateOne: {
          filter: { _id: new ObjectId(eventInApp._id) },
          update: { $set: mapGoogleEventToAppEvent(userId, googleEvent) },
        },
      })
    }

    if (googleEvent.status === "cancelled" && eventInApp) {
      deleteOps.push({
        deleteOne: {
          filter: { _id: new ObjectId(eventInApp._id) },
        },
      })
    }
  })

  if (insertOps.length > 0) {
    await EventsDao.bulkWrite(insertOps)
  }

  if (updateOps.length > 0) {
    await EventsDao.bulkWrite(updateOps)
  }

  if (deleteOps.length > 0) {
    await EventsDao.bulkWrite(deleteOps)
  }
}

export async function getEventsBySource(eventSource: string, from: Date, to: Date) {
  const events = await EventsDao.findBySourceAndMeta(eventSource, from, to)
  return events
}

export default {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  getEventsBySource,
  syncEventsFromGoogle,
}
