import { Request, Response } from 'express';
import planningService from '@services/api/planning.services';
import logger from '@/common/logger';
import { User } from '@/entities/User';
import { ObjectId } from 'mongodb';

export default class PlanningController {
  static async runDaySuggestions(req: Request & { user: User }, res: Response) {
    try {
      const conversationId = req.params.conversationId as any as ObjectId;
      const date = req.body.date as any as Date;
      const extraInfo = req.body.extraInfo;

      const suggestions = await planningService.getDaySuggestions(req.user, conversationId, date, extraInfo);
      res.status(200).json(suggestions);
    } catch (error) {
      logger.error(`Error in runDaySuggestions: ${error}`);
      res.status(500).json({ error: 'Failed to run day suggestions' });
    }
  }
}
