import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { DatabaseName } from '@common/configs/mongodb-client.config';
import { HabitsCollectionName, HabitPriorities, RepeatUnits, DaysOfWeek } from '@/common/consts/constants';
import logger from '@/common/logger';
import { Habit } from '@/entities/Habit';

let _habits: Collection<Habit>;
let _db: Db;

export default class HabitsDao {
  static injectDB(conn: MongoClient) {
    if (_habits) {
      return;
    }

    try {
      _db = conn.db(DatabaseName);
      _habits = _db.collection(HabitsCollectionName);

      _habits.createIndex({ userId: 1 });
      _habits.createIndex({ title: 'text', detail: 'text' });

      _db.command({
        collMod: HabitsCollectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'title', 'priority', 'repeat'],
            properties: {
              _id: { bsonType: 'objectId' },
              userId: { bsonType: 'objectId' },
              title: { bsonType: 'string', maxLength: 255 },
              detail: { bsonType: 'string' },
              priority: { enum: HabitPriorities },
              category: { bsonType: 'string', maxLength: 100 },
              color: { bsonType: 'string' }, // HEX code or color name
              emoji: { bsonType: 'string', maxLength: 10 },
              isCurrent: { bsonType: 'bool' },
              isDesired: { bsonType: 'bool' },
              repeat: {
                bsonType: 'object',
                required: ['unit', 'frequency'],
                properties: {
                  unit: { enum: RepeatUnits }, // 'day', 'week', 'month'
                  frequency: { bsonType: 'number', minimum: 1 },
                  daysOfWeek: {
                    bsonType: 'array',
                    items: { enum: DaysOfWeek } // 0 for Sunday, 1 for Monday, etc.
                  },
                  daysOfMonth: {
                    bsonType: 'array',
                    items: { bsonType: 'number', minimum: 0, maximum: 31 } // 0 for the last day of the month
                  }
                },
                additionalProperties: false
              },
              idealDuration: { bsonType: 'number', minimum: 0 }, // in minutes
              startTime: { bsonType: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' },
              endTime: { bsonType: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' },
              createdAt: { bsonType: 'date' },
              updatedAt: { bsonType: 'date' },
            },
            additionalProperties: false,
          },
        },
      });
    } catch (e) {
      logger.error(`Unable to establish a collection handle in HabitsDao: ${e}`);
    }
  }

  static async getHabits(filter: {
    userId: ObjectId,
    category?: string,
    priority?: string,
    keyword?: string
  }) {
    const { userId, category, priority, keyword } = filter;
    const query: any = { userId };

    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority;
    }

    if (keyword) {
      query.$text = { $search: keyword };
    }

    try {
      return await _habits.find(query).toArray();
    } catch (e) {
      logger.error(`Error fetching habits: ${e}`);
      return [];
    }
  }

  static async createHabit(habit: Habit) {
    try {
      habit._id = new ObjectId();
      habit.createdAt = new Date();
      habit.updatedAt = new Date();

      const result = await _habits.insertOne(habit);
      return result.insertedId;
    } catch (e) {
      logger.error(`Error creating habit: ${e}`);
      return null;
    }
  }

  static async updateHabit(habitId: ObjectId, update: Partial<Habit>) {
    try {
      update.updatedAt = new Date();

      console.log(update);

      const result = await _habits.updateOne({ _id: habitId }, { $set: update });
      return result.modifiedCount > 0;
    } catch (e) {
      logger.error(`Error updating habit: ${e}`);
      return false;
    }
  }

  static async deleteHabit(habitId: ObjectId) {
    try {
      const result = await _habits.deleteOne({ _id: habitId });
      return result.deletedCount > 0;
    } catch (e) {
      logger.error(`Error deleting habit: ${e}`);
      return false;
    }
  }

  static async getHabitById(habitId: ObjectId) {
    try {
      return await _habits.findOne({ _id: habitId });
    } catch (e) {
      logger.error(`Error fetching habit by ID: ${e}`);
      return null;
    }
  }

  static async getHabitsByUserId(userId: ObjectId) {
    try {
      return await _habits.find({ userId }).toArray();
    } catch (e) {
      logger.error(`Error fetching habits by user ID: ${e}`);
      return [];
    }
  }
}
