import logger from '@/common/logger'
import { Request, Response } from 'express'
import eventsService, { syncEventsFromGoogle } from '@services/api/events.services'
import { ObjectId } from 'mongodb'
import { User } from '@/entities/User'
import { OAuth2Client } from 'google-auth-library'
import { getCalendarTimezone } from '@/services/support/calendar_facade'
import usersServices from '@/services/api/users.services'

export default class EventsController {
  static async getEvents(req: Request & { user: User }, res: Response) {
    try {
      const { start, end, calendarId, categories } = req.query
      const filter = {
        userId: req.user._id,
        from: new Date(start as string),
        to: new Date(end as string),
        calendarId: calendarId as string,
        categories: categories ? (categories as string).split(',') : undefined,
      }

      const events = await eventsService.getEvents(filter)
      res.status(200).json(events)
    } catch (e) {
      logger.error(`Error getting events: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async createEvent(req: Request & { user: User }, res: Response) {
    try {
      const eventData = { ...req.body }
      const eventId = await eventsService.createEvent(eventData)
      if (!eventId) {
        return res.status(400).json({ error: 'Failed to create event' })
      }

      const createdEvent = await eventsService.getEventById(eventId)
      res.status(201).json(createdEvent)
    } catch (e) {
      logger.error(`Error creating event: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async updateEvent(req: Request, res: Response) {
    try {
      const eventId = new ObjectId(req.params.eventId)
      const updateData = req.body

      const success = await eventsService.updateEvent(eventId, updateData)
      if (!success) {
        return res.status(400).json({ error: 'Failed to update event' })
      }

      const updatedEvent = await eventsService.getEventById(eventId)
      res.status(200).json(updatedEvent)
    } catch (e) {
      logger.error(`Error updating event: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async deleteEvent(req: Request, res: Response) {
    try {
      const eventId = new ObjectId(req.params.eventId)

      const success = await eventsService.deleteEvent(eventId)
      if (!success) {
        return res.status(400).json({ error: 'Failed to delete event' })
      }

      res.sendStatus(204)
    } catch (e) {
      logger.error(`Error deleting event: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async syncEventsFromGoogle(req: Request & { oAuth2Client: OAuth2Client, user: User }, res: Response) {
    try {
      const { from, to } = req.query

      const changedEventsCount = await syncEventsFromGoogle(
        req.oAuth2Client,
        req.user._id,
        new Date(from as string), new Date(to as string)
      )

      const calendarTimezone = await getCalendarTimezone(req.oAuth2Client)
      await usersServices.updateTimezone(req.user, calendarTimezone) // TODO: Consider multiple calendars, multiple timezones.

      res.status(200).json({
        changedEventsCount
      })
    } catch (e) {
      logger.error(`Error syncing events from Google: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }
}
