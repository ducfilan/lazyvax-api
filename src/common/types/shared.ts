export type PlanQuestion = {
  question: string,
  answerOptions?: string[],
  selectedAnswer?: string,
}

export type GoalSettingCategoryQuestion = {
  question: string,
  options: string[],
}

export type GoalSettingCategoryQuestionAnswer = {
  question: string,
  answer: string,
}