import { User } from "@/models/User";
import { ObjectId } from "mongodb";
import { getConversation } from "./conversations.services";
import { CompletionAiService } from "../support/ai.services";
import logger from "@/common/logger";

export async function getActionCompletion(user: User, conversationId: ObjectId, milestoneId: ObjectId) {
  const prompt = await buildPrompt(conversationId, milestoneId)
  if (!prompt) {
    logger.info(`cannot generate prompt from conversationId: ${conversationId}, milestoneId: ${milestoneId}`)
    return ""
  }

  return CompletionAiService.query<string>(user, prompt)
}

async function buildPrompt(conversationId: ObjectId, milestoneId: ObjectId): Promise<string> {
  const conversation = await getConversation(conversationId)
  if (!conversation) {
    return null
  }

  const milestone = conversation.userMilestones?.find(m => m._id.equals(milestoneId))
  if (!milestone) {
    return null
  }

  return `${conversation.description}
  The following is 1 of many milestones I have, with a list of current actions to support that milestone. Suggest me only 1 more action that is actionable, specific, executable, achievable.
  Milestone: ${milestone.milestone}
  Actions:
  ${milestone.actions.map(a => a.action).join("\n")}
  Answer concisely in 1 sentence, don't say anything else, don't mention action number.`
}
