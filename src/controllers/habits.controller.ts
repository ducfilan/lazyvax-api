import { Request, Response } from 'express';
import habitsService from '@services/api/habits.services';
import { ObjectId } from 'mongodb';
import logger from '@/common/logger';
import { User } from '@/entities/User';

export default class HabitsController {
  static async getHabits(req: Request & { user: User }, res: Response) {
    try {
      const { category, priority, keyword } = req.query;
      const userId = req.user._id;

      const filter = {
        userId,
        category: category as string,
        priority: priority as string,
        keyword: keyword as string,
      };

      const habits = await habitsService.getHabits(filter);
      res.status(200).json(habits);
    } catch (error) {
      logger.error(`Error in getHabits: ${error}`);
      res.status(500).json({ error: 'Failed to fetch habits' });
    }
  }

  static async createHabit(req: Request & { user: User }, res: Response) {
    try {
      const userId = req.user._id;
      const habitData = {
        userId,
        ...req.body,
      };

      const newHabit = await habitsService.createHabit(habitData);
      res.status(201).json(newHabit);
    } catch (error) {
      logger.error(`Error in createHabit: ${error}`);
      res.status(500).json({ error: 'Failed to create habit' });
    }
  }

  static async updateHabit(req: Request & { user: User }, res: Response) {
    try {
      const habitId = new ObjectId(req.params.id);
      const updateData = req.body;

      const updatedHabit = await habitsService.updateHabit(habitId, updateData);
      res.status(200).json(updatedHabit);
    } catch (error) {
      logger.error(`Error in updateHabit: ${error}`);
      res.status(500).json({ error: 'Failed to update habit' });
    }
  }

  static async deleteHabit(req: Request & { user: User }, res: Response) {
    try {
      const habitId = new ObjectId(req.params.id);

      await habitsService.deleteHabit(habitId);
      res.status(204).send();
    } catch (error) {
      logger.error(`Error in deleteHabit: ${error}`);
      res.status(500).json({ error: 'Failed to delete habit' });
    }
  }
}
