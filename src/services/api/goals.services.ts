import { ObjectId } from 'mongodb'
import GoalsDao from '@dao/goals.dao'
import { Goal } from '@/entities/Goal'
import { GoalSettingCategoryQuestionAnswer } from '@/common/types/shared'
import { determineGoalSettingCategory as classifyGoalSettingCategory } from '@/services/support/lang_graph/steps'
import { updateGoalSettingCategory } from './users.services'
import { User } from '@/entities/User'

export async function getGoals(filter: {
  userId: ObjectId,
  type?: string,
  fromDate?: Date,
  toDate?: Date,
  areaId?: ObjectId,
  keyword?: string
}) {
  return await GoalsDao.getGoals(filter)
}

export async function createGoal(goalData: {
  title: string,
  type: string,
  fromDate: Date,
  toDate: Date,
  detail: string,
  atAge?: number,
  alignGoals?: ObjectId[],
  alignAreas?: ObjectId[],
}) {
  const goal: Goal = {
    ...goalData,
    alignGoals: goalData.alignGoals || [],
    alignAreas: goalData.alignAreas || [],
  }

  return await GoalsDao.createGoal(goal)
}

export async function updateGoal(goalId: ObjectId, updateData: Partial<Goal>) {
  return await GoalsDao.updateGoal(goalId, updateData)
}

export async function deleteGoal(goalId: ObjectId) {
  return await GoalsDao.deleteGoal(goalId)
}

export async function getGoalById(goalId: ObjectId) {
  return await GoalsDao.getGoalById(goalId)
}

export async function getGoalsByUserId(userId: ObjectId) {
  return await GoalsDao.getGoalsByUserId(userId)
}

export async function getGoalsByAlignGoalId(userId: ObjectId, alignGoalId: ObjectId) {
  return await GoalsDao.getGoalsByAlignGoalId(userId, alignGoalId)
}

export async function getGoalsByAreaId(userId: ObjectId, areaId: ObjectId) {
  return await GoalsDao.getGoalsByAreaId(userId, areaId)
}

export async function determineGoalSettingCategory(user: User, answers: GoalSettingCategoryQuestionAnswer[]) {
  const category = await classifyGoalSettingCategory(answers)
  await updateGoalSettingCategory(user, category)

  return category
}

export default {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalById,
  getGoalsByUserId,
  getGoalsByAlignGoalId,
  getGoalsByAreaId,
  determineGoalSettingCategory,
}
