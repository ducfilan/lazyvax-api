import { ObjectId } from 'mongodb'
import ObjectivesDao from '@dao/objectives.dao'
import { Objective } from '@/entities/Objective'

export async function getObjectives(filter: {
  userId: ObjectId,
  type?: string,
  fromDate?: Date,
  toDate?: Date,
  areaId?: ObjectId,
  keyword?: string
}) {
  return await ObjectivesDao.getObjectives(filter)
}

export async function createObjective(objectiveData: {
  title: string,
  type: string,
  fromDate: Date,
  toDate: Date,
  detail: string,
  atAge?: number,
  alignObjectives?: ObjectId[],
  alignAreas?: ObjectId[],
}) {
  const objective: Objective = {
    ...objectiveData,
    alignObjectives: objectiveData.alignObjectives || [],
    alignAreas: objectiveData.alignAreas || [],
  }

  return await ObjectivesDao.createObjective(objective)
}

export async function updateObjective(objectiveId: ObjectId, updateData: Partial<Objective>) {
  return await ObjectivesDao.updateObjective(objectiveId, updateData)
}

export async function deleteObjective(objectiveId: ObjectId) {
  return await ObjectivesDao.deleteObjective(objectiveId)
}

export async function getObjectiveById(objectiveId: ObjectId) {
  return await ObjectivesDao.getObjectiveById(objectiveId)
}

export async function getObjectivesByUserId(userId: ObjectId) {
  return await ObjectivesDao.getObjectivesByUserId(userId)
}

export async function getObjectivesByAlignObjectiveId(userId: ObjectId, alignObjectiveId: ObjectId) {
  return await ObjectivesDao.getObjectivesByAlignObjectiveId(userId, alignObjectiveId)
}

export async function getObjectivesByAreaId(userId: ObjectId, areaId: ObjectId) {
  return await ObjectivesDao.getObjectivesByAreaId(userId, areaId)
}

export default {
  getObjectives,
  createObjective,
  updateObjective,
  deleteObjective,
  getObjectiveById,
  getObjectivesByUserId,
  getObjectivesByAlignObjectiveId,
  getObjectivesByAreaId,
}
