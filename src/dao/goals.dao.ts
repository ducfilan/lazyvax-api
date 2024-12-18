import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { DatabaseName } from '@common/configs/mongodb-client.config';
import { GoalsCollectionName } from '@/common/consts/constants';
import { GoalTypes } from '@/common/consts/shared';
import logger from '@/common/logger';
import { Goal } from '@/entities/Goal';

let _goals: Collection<Goal>;
let _db: Db;

export default class GoalsDao {
  static injectDB(conn: MongoClient) {
    if (_goals) {
      return;
    }

    try {
      _db = conn.db(DatabaseName);
      _goals = _db.collection(GoalsCollectionName);

      _goals.createIndex({ userId: 1 })
      _goals.createIndex({ alignGoals: 1 })
      _goals.createIndex({ areas: 1 })
      _goals.createIndex({ title: 'text', detail: 'text' })

      _db.command({
        collMod: GoalsCollectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'title', 'type'],
            properties: {
              _id: { bsonType: 'objectId' },
              userId: { bsonType: 'objectId' },
              title: { bsonType: 'string', maxLength: 255 },
              detail: { bsonType: 'string' },
              type: { enum: GoalTypes },
              fromDate: { bsonType: 'date' },
              toDate: { bsonType: 'date' },
              atAge: { bsonType: 'int' },
              alignHabits: { bsonType: 'array', items: { bsonType: 'objectId' } },
              alignGoals: { bsonType: 'array', items: { bsonType: 'objectId' } },
              alignAreas: { bsonType: 'array', items: { bsonType: 'string', maxLength: 50 } },
            },
            additionalProperties: false,
          },
        },
      });
    } catch (e) {
      logger.error(`Unable to establish a collection handle in GoalsDao: ${e}`);
    }
  }

  static async getGoals(filter: {
    userId: ObjectId,
    type?: string,
    fromDate?: Date,
    toDate?: Date,
    areaId?: ObjectId,
    keyword?: string
  }) {
    const { userId, type, fromDate, toDate, areaId, keyword } = filter

    const query: any = { userId }

    if (type) {
      query.type = type
    }

    if (fromDate && toDate) {
      query.fromDate = { $gte: fromDate }
      query.toDate = { $lte: toDate }
    } else if (fromDate) {
      query.fromDate = { $gte: fromDate }
    } else if (toDate) {
      query.toDate = { $lte: toDate }
    }

    if (areaId) {
      query.areas = areaId
    }

    if (keyword) {
      query.$text = { $search: keyword }
    }

    try {
      return await _goals.find(query).toArray()
    } catch (e) {
      logger.error(`Error fetching goals: ${e}`)
      return []
    }
  }

  static async createGoal(goal: Goal) {
    try {
      goal._id = new ObjectId()
      const result = await _goals.insertOne(goal)
      return result.insertedId
    } catch (e) {
      logger.error(`Error creating goal: ${e}`)
      return null
    }
  }

  static async updateGoal(goalId: ObjectId, update: Partial<Goal>) {
    try {
      const result = await _goals.updateOne({ _id: goalId }, { $set: update })
      return result.modifiedCount > 0
    } catch (e) {
      logger.error(`Error updating goal: ${e}`)
      return false
    }
  }

  static async deleteGoal(goalId: ObjectId) {
    try {
      const result = await _goals.deleteOne({ _id: goalId })
      return result.deletedCount > 0
    } catch (e) {
      logger.error(`Error deleting goal: ${e}`)
      return false
    }
  }

  static async getGoalById(goalId: ObjectId) {
    try {
      return await _goals.findOne({ _id: goalId })
    } catch (e) {
      logger.error(`Error fetching goal by ID: ${e}`)
      return null
    }
  }

  static async getGoalsByUserId(userId: ObjectId) {
    try {
      return await _goals.find({ userId }).toArray()
    } catch (e) {
      logger.error(`Error fetching goals by user ID: ${e}`)
      return []
    }
  }

  static async getGoalsByAlignGoalId(userId: ObjectId, alignGoalId: ObjectId) {
    try {
      return await _goals.find({ userId, alignGoals: alignGoalId }).toArray()
    } catch (e) {
      logger.error(`Error fetching goals by align target ID: ${e}`)
      return []
    }
  }

  static async getGoalsByAreaId(userId: ObjectId, areaId: ObjectId) {
    try {
      return await _goals.find({ userId, areas: areaId }).toArray()
    } catch (e) {
      logger.error(`Error fetching goals by area ID: ${e}`)
      return []
    }
  }
}

