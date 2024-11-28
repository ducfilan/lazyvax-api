import { Request, Response } from 'express';
import planningService from '@services/api/planning.services';
import logger from '@/common/logger';
import { User } from '@/entities/User';
import { ObjectId } from 'mongodb';

export default class PlanningController {
  static async getDaySuggestions(req: Request & { user: User }, res: Response) {
    try {
      const conversationId = req.query.conversationId as any as ObjectId;
      const date = req.query.date as any as Date;

      const suggestions = await planningService.getDaySuggestions(req.user, conversationId, date);
      res.status(200).json(suggestions);
    } catch (error) {
      logger.error(`Error in getDaySuggestions: ${error}`);
      res.status(500).json({ error: 'Failed to fetch day suggestions' });
    }
  }
}
