import { ObjectId } from 'mongodb';
import { dayPlanWorkflow } from '../support/lang_graph/workflows';
import { User } from '@/entities/User';

export async function getDaySuggestions(user: User, conversationId: ObjectId, targetDayToPlan: Date) {
  const result = await dayPlanWorkflow.runWorkflow({
    userInfo: user,
    conversationId,
    targetDayToPlan,
  })

  return {
    currentStep: result.targetStep,
    needToConfirmToPlanLate: result.needToConfirmToPlanLate,
    dayActivitiesSuggestion: result.dayActivitiesSuggestion,
    activitiesArrange: result.dayActivitiesArrange,
  }
}

export default {
  getDaySuggestions,
};