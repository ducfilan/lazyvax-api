import { Request, Response } from 'express'
import goalsService from '@/services/api/goals.services'
import { ObjectId } from 'mongodb'
import logger from '@/common/logger'
import { User } from '@/entities/User'
import { goalSettingCategoryQuestionsWorkflow } from '@/services/support/lang_graph/workflows'

export default class GoalsController {
  static async getGoals(req: Request & { user: User }, res: Response) {
    try {
      const { type, fromDate, toDate, areaId, keyword } = req.query
      const userId = req.user._id

      const filter = {
        userId,
        type: type as string,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        areaId: areaId ? new ObjectId(areaId as string) : undefined,
        keyword: keyword as string,
      }

      const goals = await goalsService.getGoals(filter)
      res.status(200).json(goals)
    } catch (e) {
      logger.error(`Error getting goals: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async createGoal(req: Request & { user: User }, res: Response) {
    try {
      const userId = req.user._id
      const goalData = {
        ...req.body,
        userId,
      }

      const goalId = await goalsService.createGoal(goalData)
      if (!goalId) {
        return res.status(400).json({ error: 'Failed to create goal' })
      }

      const createdGoal = await goalsService.getGoalById(goalId)
      res.status(201).json(createdGoal)
    } catch (e) {
      logger.error(`Error creating goal: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async updateGoal(req: Request, res: Response) {
    try {
      const goalId = new ObjectId(req.params.goalId)
      const updateData = req.body

      const success = await goalsService.updateGoal(goalId, updateData)
      if (!success) {
        return res.status(400).json({ error: 'Failed to update goal' })
      }

      const updatedGoal = await goalsService.getGoalById(goalId)
      res.status(200).json(updatedGoal)
    } catch (e) {
      logger.error(`Error updating goal: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async deleteGoal(req: Request, res: Response) {
    try {
      const goalId = new ObjectId(req.params.goalId)

      const success = await goalsService.deleteGoal(goalId)
      if (!success) {
        return res.status(400).json({ error: 'Failed to delete goal' })
      }

      res.sendStatus(204)
    } catch (e) {
      logger.error(`Error deleting goal: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async getGoalById(req: Request, res: Response) {
    try {
      const goalId = new ObjectId(req.params.goalId)
      const goal = await goalsService.getGoalById(goalId)

      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' })
      }

      res.status(200).json(goal)
    } catch (e) {
      logger.error(`Error fetching goal by ID: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async getGoalSettingCategoryQuestions(req: Request & { user: User }, res: Response) {
    try {
      const result = await goalSettingCategoryQuestionsWorkflow.runWorkflow({
        userInfo: req.user,
      })
      res.status(200).json(result.result.questions)
    } catch (e) {
      logger.error(`Error getting goal setting level: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }
}
