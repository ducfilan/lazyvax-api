import { GoalSettingCategoryQuestionAnswer } from "@/common/types/shared";
import { getModel } from "./model_repo";
import { goalSettingCategoryDetermineInstruction } from "./prompts";
import { goalSettingCategoryDetermineTemplate } from "./prompts";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ModelNameChatGPT4oMini } from "./model_repo";

export type GoalSettingCategory = 'Confident Achiever' | 'Motivated but Distracted' | 'Overwhelmed Starter' | 'Needs Encouragement';

export async function determineGoalSettingCategory(
  answers: GoalSettingCategoryQuestionAnswer[]
): Promise<GoalSettingCategory> {
  if (!answers || answers.length === 0) {
    throw new Error('User answers are required to determine category')
  }

  const prompt = await ChatPromptTemplate.fromMessages([
    ["human", goalSettingCategoryDetermineTemplate],
  ]).formatMessages({
    answers: answers.map(({ question, answer }) => `Question: ${question}\nAnswer: ${answer}`).join('\n\n'),
    instructions: goalSettingCategoryDetermineInstruction,
  })

  const result = await getModel(ModelNameChatGPT4oMini).invoke(prompt)
  const category = result.content as GoalSettingCategory

  return category
}
