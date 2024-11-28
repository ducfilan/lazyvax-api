import { Request, Response } from 'express';
import planningService from '@services/api/planning.services';
import logger from '@/common/logger';
import { User } from '@/entities/User';

export default class PlanningController {
  static async getDaySuggestions(req: Request & { user: User }, res: Response) {
    try {
      const userId = req.user._id;
      const date = req.query.date as any as Date;
      const suggestions = await planningService.getDaySuggestions(userId, date);
      res.status(200).json(suggestions);
    } catch (error) {
      logger.error(`Error in getDaySuggestions: ${error}`);
      res.status(500).json({ error: 'Failed to fetch day suggestions' });
    }
  }
}
