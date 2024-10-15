import logger from '@/common/logger'
import { Request, Response } from 'express';
import eventsService from '@services/api/events.services';
import { ObjectId } from 'mongodb';
import { User } from '@/entities/User';

export default class EventsController {
  static async getEvents(req: Request & { user: User }, res: Response) {
    try {
      const { start, end, calendarId, categories } = req.query;
      const filter = {
        start: new Date(start as string),
        end: new Date(end as string),
        calendarId: calendarId ? new ObjectId(calendarId as string) : undefined,
        categories: categories ? (categories as string).split(',') : undefined,
      };

      const events = await eventsService.getEvents(filter);
      res.status(200).json(events);
    } catch (e) {
      logger.error(`Error getting events: ${e}`);
      res.status(500).json({ error: e.message });
    }
  }

  static async createEvent(req: Request & { user: User }, res: Response) {
    try {
      const eventData = { ...req.body };
      const eventId = await eventsService.createEvent(eventData);
      if (!eventId) {
        return res.status(400).json({ error: 'Failed to create event' });
      }

      const createdEvent = await eventsService.getEventById(eventId);
      res.status(201).json(createdEvent);
    } catch (e) {
      logger.error(`Error creating event: ${e}`);
      res.status(500).json({ error: e.message });
    }
  }

  static async updateEvent(req: Request, res: Response) {
    try {
      const eventId = new ObjectId(req.params.eventId);
      const updateData = req.body;

      const success = await eventsService.updateEvent(eventId, updateData);
      if (!success) {
        return res.status(400).json({ error: 'Failed to update event' });
      }

      const updatedEvent = await eventsService.getEventById(eventId);
      res.status(200).json(updatedEvent);
    } catch (e) {
      logger.error(`Error updating event: ${e}`);
      res.status(500).json({ error: e.message });
    }
  }

  static async deleteEvent(req: Request, res: Response) {
    try {
      const eventId = new ObjectId(req.params.eventId);

      const success = await eventsService.deleteEvent(eventId);
      if (!success) {
        return res.status(400).json({ error: 'Failed to delete event' });
      }

      res.sendStatus(204);
    } catch (e) {
      logger.error(`Error deleting event: ${e}`);
      res.status(500).json({ error: e.message });
    }
  }
}
