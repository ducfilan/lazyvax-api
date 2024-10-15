import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { DatabaseName } from '@common/configs/mongodb-client.config';
import { EventsCollectionName } from '@common/consts';
import logger from '@/common/logger';
import { Event } from '@/entities/Event';

let _events: Collection<Event>;
let _db: Db;

export default class EventsDao {
  static injectDB(conn: MongoClient) {
    if (_events) {
      return;
    }

    try {
      _db = conn.db(DatabaseName);
      _events = _db.collection(EventsCollectionName);

      _events.createIndex({ calendarId: 1 });
      _events.createIndex({ categories: 1 });
      _events.createIndex({ title: 'text', description: 'text' });

      _db.command({
        collMod: EventsCollectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['title', 'startDate', 'endDate'],
            properties: {
              _id: { bsonType: 'objectId' },
              source: { bsonType: 'string' },
              title: { bsonType: 'string', maxLength: 255 },
              description: { bsonType: 'string' },
              startDate: { bsonType: 'date' },
              endDate: { bsonType: 'date' },
              allDayEvent: { bsonType: 'bool' },
              location: { bsonType: 'string', maxLength: 500 },
              reminders: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  required: ['type', 'time'],
                  properties: {
                    type: { bsonType: 'string' },
                    time: { bsonType: 'number' },
                  },
                },
              },
              attendees: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  properties: {
                    email: { bsonType: 'string' },
                    name: { bsonType: 'string' },
                    response: { enum: ['accepted', 'declined', 'tentative'] },
                  },
                },
              },
              categories: { bsonType: 'array', items: { bsonType: 'string' } },
              taskIds: { bsonType: 'array', items: { bsonType: 'objectId' } },
              objectiveIds: { bsonType: 'array', items: { bsonType: 'objectId' } },
              color: { bsonType: 'string' },
              calendarId: { bsonType: 'objectId' },
              isPrivate: { bsonType: 'bool' },
              isDeleted: { bsonType: 'bool' },
              createdAt: { bsonType: 'date' },
              updatedAt: { bsonType: 'date' },
            },
            additionalProperties: false,
          },
        },
      });
    } catch (e) {
      logger.error(`Unable to establish a collection handle in EventsDao: ${e}`);
    }
  }

  static async getEvents(filter: { start: Date; end: Date; calendarId?: ObjectId; categories?: string[] }) {
    const { start, end, calendarId, categories } = filter;
    const query: any = { startDate: { $gte: start }, endDate: { $lte: end } };

    if (calendarId) query.calendarId = calendarId;
    if (categories) query.categories = { $in: categories };

    try {
      return await _events.find(query).toArray();
    } catch (e) {
      logger.error(`Error fetching events: ${e}`);
      return [];
    }
  }

  static async createEvent(event: Event) {
    try {
      event._id = new ObjectId();
      event.createdAt = new Date();
      event.updatedAt = new Date();
      const result = await _events.insertOne(event);
      return result.insertedId;
    } catch (e) {
      logger.error(`Error creating event: ${e}`);
      return null;
    }
  }

  static async createMultipleEvents(events: Event[]) {
    try {
      const preparedEvents = events.map((event) => ({
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...event,
      }));

      const result = await _events.insertMany(preparedEvents);
      return result.insertedIds;
    } catch (e) {
      logger.error(`Error creating multiple events: ${e}`);
      return null;
    }
  }

  static async updateEvent(eventId: ObjectId, update: Partial<Event>) {
    try {
      update.updatedAt = new Date();
      const result = await _events.updateOne({ _id: eventId }, { $set: update });
      return result.modifiedCount > 0;
    } catch (e) {
      logger.error(`Error updating event: ${e}`);
      return false;
    }
  }

  static async deleteEvent(eventId: ObjectId) {
    try {
      const result = await _events.deleteOne({ _id: eventId });
      return result.deletedCount > 0;
    } catch (e) {
      logger.error(`Error deleting event: ${e}`);
      return false;
    }
  }

  static async getEventById(eventId: ObjectId) {
    try {
      return await _events.findOne({ _id: eventId });
    } catch (e) {
      logger.error(`Error fetching event by ID: ${e}`);
      return null;
    }
  }
}
