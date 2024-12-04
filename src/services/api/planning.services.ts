import { ObjectId } from 'mongodb';
import { dayPlanWorkflow } from '../support/lang_graph/workflows';
import { User } from '@/entities/User';
import { arrangeDayStep, askMoreInfoStep, DayPlanSteps, generateDayTasksStep } from '@/common/consts/shared';

export async function getDaySuggestions(user: User, conversationId: ObjectId, targetDayToPlan: Date, extraInfo: object) {
  const result = await dayPlanWorkflow.runWorkflow({
    userInfo: user,
    conversationId,
    targetDayToPlan,
    ...(extraInfo ?? {}),
  })

  const output: any = {
    currentStep: result.targetStep,
    forcedToPlanLate: result.forcedToPlanLate,
    needToConfirmToPlanLate: result.needToConfirmToPlanLate,
  }

  if (result.targetStep === DayPlanSteps[askMoreInfoStep]) {
    output.questions = result.questions
  }

  if (result.targetStep === DayPlanSteps[generateDayTasksStep]) {
    output.dayActivitiesSuggestion = result.dayActivitiesSuggestion
  }

  if (result.targetStep === DayPlanSteps[arrangeDayStep]) {
    output.dayActivitiesArrange = result.dayActivitiesArrange
  }

  return output
}

export default {
  getDaySuggestions,
};
