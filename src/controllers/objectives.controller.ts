import { Request, Response } from 'express'
import objectivesService from '@services/api/objectives.services'
import { ObjectId } from 'mongodb'
import logger from '@/common/logger'
import { User } from '@/entities/User'
import { goalSettingLevelWorkflow } from '@/services/support/lang_graph/workflows'

export default class ObjectivesController {
  static async getObjectives(req: Request & { user: User }, res: Response) {
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

      const objectives = await objectivesService.getObjectives(filter)
      res.status(200).json(objectives)
    } catch (e) {
      logger.error(`Error getting objectives: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async createObjective(req: Request & { user: User }, res: Response) {
    try {
      const userId = req.user._id
      const objectiveData = {
        ...req.body,
        userId,
      }

      const objectiveId = await objectivesService.createObjective(objectiveData)
      if (!objectiveId) {
        return res.status(400).json({ error: 'Failed to create objective' })
      }

      const createdObjective = await objectivesService.getObjectiveById(objectiveId)
      res.status(201).json(createdObjective)
    } catch (e) {
      logger.error(`Error creating objective: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async updateObjective(req: Request, res: Response) {
    try {
      const objectiveId = new ObjectId(req.params.objectiveId)
      const updateData = req.body

      const success = await objectivesService.updateObjective(objectiveId, updateData)
      if (!success) {
        return res.status(400).json({ error: 'Failed to update objective' })
      }

      const updatedObjective = await objectivesService.getObjectiveById(objectiveId)
      res.status(200).json(updatedObjective)
    } catch (e) {
      logger.error(`Error updating objective: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async deleteObjective(req: Request, res: Response) {
    try {
      const objectiveId = new ObjectId(req.params.objectiveId)

      const success = await objectivesService.deleteObjective(objectiveId)
      if (!success) {
        return res.status(400).json({ error: 'Failed to delete objective' })
      }

      res.sendStatus(204)
    } catch (e) {
      logger.error(`Error deleting objective: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async getObjectiveById(req: Request, res: Response) {
    try {
      const objectiveId = new ObjectId(req.params.objectiveId)
      const objective = await objectivesService.getObjectiveById(objectiveId)

      if (!objective) {
        return res.status(404).json({ error: 'Objective not found' })
      }

      res.status(200).json(objective)
    } catch (e) {
      logger.error(`Error fetching objective by ID: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async getGoalSettingLevel(req: Request, res: Response) {
    try {
      const result = await goalSettingLevelWorkflow.runWorkflow()
      res.status(200).json(result.result.questions)
    } catch (e) {
      logger.error(`Error getting goal setting level: ${e}`)
      res.status(500).json({ error: e.message })
    }
  }
}
