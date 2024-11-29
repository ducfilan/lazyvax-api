import { ObjectId } from 'mongodb'
import EventsDao from '@dao/events.dao'
import { Event, GoogleCalendarMeta, mapGoogleEventToAppEvent } from '@/entities/Event'
import { getEventsFromGoogleCalendar } from '../support/calendar_facade'
import { CalendarSourceApp } from '@/common/consts/constants';
import { ConversationTypeWeek } from '@/common/consts/shared';
import { OAuth2Client } from 'google-auth-library';
import { GetEventFilters } from '@/common/types/types';

export async function getEvents(filter: GetEventFilters, sort?: { [key: string]: 1 | -1 }) {
  if (!filter.type) {
    filter.type = ConversationTypeWeek
  }

  return await EventsDao.getEvents(filter, sort)
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

export async function syncEventsFromGoogle(oAuth2Client: OAuth2Client, userId: ObjectId, from: Date, to: Date, calendarId: string = "primary") {
  const insertOps = []
  const updateOps = []
  const deleteOps = []

  const eventsInApp = await getEvents({ userId, from, to })
  const appEventIdToAppEvent = new Map<string, Event>()
  const googleEventIdToAppEvent = new Map<string, Event>()
  eventsInApp.forEach(appEvent => {
    appEventIdToAppEvent.set(appEvent._id.toString(), appEvent)
    const meta = appEvent.meta as GoogleCalendarMeta
    if (meta?.id) {
      googleEventIdToAppEvent.set(meta.id, appEvent)
    }
  })

  const googleEvents = await getEventsFromGoogleCalendar({
    oAuth2Client,
    calendarId,
    fromDate: from,
    toDate: to,
    showDeleted: true
  })

  googleEvents.forEach((googleEvent) => {
    const isEventConfirmed = googleEvent.status === "confirmed"
    const isEventCanceled = googleEvent.status === "cancelled"
    const appEventId = googleEvent.extendedProperties?.private?.appEventId
    const appEvent = appEventIdToAppEvent.get(appEventId)
    const googleEventInApp = googleEventIdToAppEvent.get(googleEvent.id)
    const isAllDayEvent = !!googleEvent.start.date
    if (isAllDayEvent) return false // Not processing all day events.

    if (!appEvent && !googleEventInApp) {
      if (isEventConfirmed) {
        insertOps.push({
          insertOne: {
            document: mapGoogleEventToAppEvent(userId, googleEvent),
          },
        })
      }
    }

    if (googleEventInApp && (googleEventInApp.meta as GoogleCalendarMeta)?.etag != googleEvent?.etag) {
      updateOps.push({
        updateOne: {
          filter: { _id: googleEventInApp._id },
          update: {
            $set: {
              ...mapGoogleEventToAppEvent(userId, googleEvent),
              updatedAt: new Date(),
            }
          },
        },
      })
    }

    if (appEvent && appEvent.updatedAt < new Date(googleEvent.updated)) {
      updateOps.push({
        updateOne: {
          filter: { _id: appEvent._id },
          update: {
            $set: {
              ...mapGoogleEventToAppEvent(userId, googleEvent),
              source: CalendarSourceApp,
              updatedAt: new Date(),
            }
          },
        },
      })
    }

    if (isEventCanceled) {
      googleEventInApp && deleteOps.push({
        deleteOne: {
          filter: { _id: new ObjectId(googleEventInApp._id) },
        },
      })

      appEvent && deleteOps.push({
        deleteOne: {
          filter: { _id: appEvent._id },
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

  return insertOps.length + updateOps.length + deleteOps.length
}

export default {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  syncEventsFromGoogle,
}
