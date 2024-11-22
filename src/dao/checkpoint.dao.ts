import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { DatabaseName } from '@common/configs/mongodb-client.config';
import logger from '@/common/logger';
import { CheckpointsCollectionName } from '@/common/consts/constants';

let _checkpoints: Collection;
let _db: Db;

export default class CheckpointDao {
  static injectDB(conn: MongoClient) {
    if (_checkpoints) {
      return;
    }

    try {
      _db = conn.db(DatabaseName);
      _checkpoints = _db.collection(CheckpointsCollectionName);
    } catch (e) {
      logger.error(`Unable to establish a collection handle in CheckpointDao: ${e}`);
    }
  }

  static async deleteCheckpointsByThreadId(threadId: string) {
    try {
      const result = await _checkpoints.deleteMany({ thread_id: threadId });
      return result.deletedCount > 0;
    } catch (e) {
      logger.error(`Error deleting checkpoints by thread ID: ${threadId} - ${e}`);
      return null;
    }
  }
}
