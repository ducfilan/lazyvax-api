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
  alignTargets?: ObjectId[],
  areas?: ObjectId[],
}) {
  const objective: Objective = {
    ...objectiveData,
    alignTargets: objectiveData.alignTargets || [],
    areas: objectiveData.areas || [],
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

export async function getObjectivesByAlignTargetId(userId: ObjectId, alignTargetId: ObjectId) {
  return await ObjectivesDao.getObjectivesByAlignTargetId(userId, alignTargetId)
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
  getObjectivesByAlignTargetId,
  getObjectivesByAreaId,
}
