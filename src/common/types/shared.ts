export type PlanQuestion = {
  question: string,
  answerOptions?: string[],
  selectedAnswer?: string,
}

export const GoalSettingCategory = ['confidentAchiever', 'motivatedButDistracted', 'overwhelmedStarter', 'needsEncouragement'];

export type GoalSettingCategoryQuestion = {
  question: string,
  options: string[],
}

export type GoalSettingCategoryQuestionAnswer = {
  question: string,
  answer: string,
}