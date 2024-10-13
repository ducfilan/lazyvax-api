import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { DatabaseName } from '@common/configs/mongodb-client.config';
import { ObjectivesCollectionName, ObjectiveTypes } from '@common/consts';
import logger from '@/common/logger';
import { Objective } from '@/models/Objective';

let _objectives: Collection<Objective>;
let _db: Db;

export default class ObjectivesDao {
  static injectDB(conn: MongoClient) {
    if (_objectives) {
      return;
    }

    try {
      _db = conn.db(DatabaseName);
      _objectives = _db.collection(ObjectivesCollectionName);

      _objectives.createIndex({ userId: 1 })
      _objectives.createIndex({ alignTargets: 1 })
      _objectives.createIndex({ areas: 1 })
      _objectives.createIndex({ title: 'text', detail: 'text' })

      _db.command({
        collMod: ObjectivesCollectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['title', 'type', 'fromDate', 'toDate'],
            properties: {
              _id: { bsonType: 'objectId' },
              userId: { bsonType: 'objectId' },
              title: { bsonType: 'string', maxLength: 255 },
              type: { enum: ObjectiveTypes },
              fromDate: { bsonType: 'date' },
              toDate: { bsonType: 'date' },
              detail: { bsonType: 'string' },
              alignTargets: { bsonType: 'array', items: { bsonType: 'objectId' } },
              areas: { bsonType: 'array', items: { bsonType: 'string', maxLength: 50 } },
            },
            additionalProperties: false,
          },
        },
      });
    } catch (e) {
      logger.error(`Unable to establish a collection handle in ObjectivesDao: ${e}`);
    }
  }

  static async getObjectives(filter: {
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
      return await _objectives.find(query).toArray()
    } catch (e) {
      logger.error(`Error fetching objectives: ${e}`)
      return []
    }
  }

  static async createObjective(objective: Objective) {
    try {
      objective._id = new ObjectId()
      const result = await _objectives.insertOne(objective)
      return result.insertedId
    } catch (e) {
      logger.error(`Error creating objective: ${e}`)
      return null
    }
  }

  static async updateObjective(objectiveId: ObjectId, update: Partial<Objective>) {
    try {
      const result = await _objectives.updateOne({ _id: objectiveId }, { $set: update })
      return result.modifiedCount > 0
    } catch (e) {
      logger.error(`Error updating objective: ${e}`)
      return false
    }
  }

  static async deleteObjective(objectiveId: ObjectId) {
    try {
      const result = await _objectives.deleteOne({ _id: objectiveId })
      return result.deletedCount > 0
    } catch (e) {
      logger.error(`Error deleting objective: ${e}`)
      return false
    }
  }

  static async getObjectiveById(objectiveId: ObjectId) {
    try {
      return await _objectives.findOne({ _id: objectiveId })
    } catch (e) {
      logger.error(`Error fetching objective by ID: ${e}`)
      return null
    }
  }

  static async getObjectivesByUserId(userId: ObjectId) {
    try {
      return await _objectives.find({ userId }).toArray()
    } catch (e) {
      logger.error(`Error fetching objectives by user ID: ${e}`)
      return []
    }
  }

  static async getObjectivesByAlignTargetId(userId: ObjectId, alignTargetId: ObjectId) {
    try {
      return await _objectives.find({ userId, alignTargets: alignTargetId }).toArray()
    } catch (e) {
      logger.error(`Error fetching objectives by align target ID: ${e}`)
      return []
    }
  }

  static async getObjectivesByAreaId(userId: ObjectId, areaId: ObjectId) {
    try {
      return await _objectives.find({ userId, areas: areaId }).toArray()
    } catch (e) {
      logger.error(`Error fetching objectives by area ID: ${e}`)
      return []
    }
  }
}

