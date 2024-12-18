import { User } from "@/entities/User";
import { ObjectId } from "mongodb";
import { getConversationById } from "./conversations.services";
import { ChatAiService, CompletionAiService } from "../support/ai_querier";
import logger from "@/common/logger";
import { getEvents } from "./events.services";
import { getLastWeekEnd, getLastWeekStart } from "@/common/utils/dateUtils";
import { eventsToWeeklySchedule } from "@/entities/Event";

export async function queryActionCompletion(user: User, conversationId: ObjectId, milestoneId: ObjectId) {
  const prompt = await buildPrompt(conversationId, milestoneId)
  if (!prompt) {
    logger.info(`cannot generate prompt from conversationId: ${conversationId}, milestoneId: ${milestoneId}`)
    return ""
  }

  return CompletionAiService.query<string>(user, prompt)
}

export async function queryGenerateWeekPlan(user: User, conversationId: ObjectId) {
  const conversation = await getConversationById(conversationId)
  if (!conversation) {
    logger.info("not match conversation", conversationId)
    return null
  }

  const lastWeekEvents = await getEvents({ userId: user._id, from: getLastWeekStart(), to: getLastWeekEnd() })

  const prompt = `${eventsToWeeklySchedule(lastWeekEvents)}`

  return ChatAiService.query<string>(user, prompt)
}

async function buildPrompt(conversationId: ObjectId, milestoneId: ObjectId): Promise<string> {
  const conversation = await getConversationById(conversationId)
  if (!conversation) {
    logger.info("not match conversation", conversationId)
    return null
  }

  return `
  The following is 1 of many milestones I have, with a list of current actions to support that milestone. Suggest me only 1 more action that is actionable, specific, executable, achievable.
  Milestone: 
  Actions:
  Answer concisely in 1 sentence, don't say anything else, don't mention action number.`
}

export async function getFutureSelfSuggestions(user: User) {
  const prompt = `
    What are the possible adjectives in many diverse aspects of life (example aspects are "Relationships", "Health", "Financial", "Personal Growth"), provide total 6 aspects personalized for me that can describe the best version of me to be happy, fulfilled, more good habits and avoid bad habits to pursuit? Add an icon before each adj, sample: "adj": "🏃 Active". Adjectives in each aspect should be related to the person and diverse.
    Answer in json structure, nothing else:
    [
      {
        "aspect": "",
        "suggestions": [
          {
            "adj": "",
            "explain": ""
          }
        ]
      }
    ]`

  return CompletionAiService.query<string>(user, prompt)
}
