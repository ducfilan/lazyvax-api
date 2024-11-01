import { ConversationTypeObjective, ConversationTypeWeek, I18nDbCodeGoalFirstMessage, I18nDbCodeWeekFirstMessage } from "@/common/consts/constants"
import ConversationsDao from "@/dao/conversations.dao"
import I18nDao from "@/dao/i18n"
import { Conversation, UserMilestone } from "@/entities/Conversation"
import { I18n } from "@/entities/I18n"
import { ObjectId } from "mongodb"

export async function isParticipantInConversation(userId: ObjectId, conversationId: ObjectId): Promise<boolean> {
  const conversation = await ConversationsDao.findById(conversationId)
  return conversation?.participants?.some(((p) => p._id?.equals(userId)))
}

export async function createConversation(conversation: Conversation) {
  return ConversationsDao.insertOne(conversation)
}

export async function updateById(conversationId: ObjectId, updateOperations) {
  return ConversationsDao.updateById(conversationId, updateOperations)
}

export async function updateProgress(conversationId: ObjectId, progress: number) {
  return ConversationsDao.updateOne(
    { _id: conversationId },
    { $set: { "meta.meta.progress": progress } },
  )
}

export async function addUserMilestone(conversationId: ObjectId, milestone: UserMilestone) {
  return ConversationsDao.updateOne(
    {
      _id: conversationId,
    },
    {
      $push: {
        userMilestones: milestone
      }
    }
  )
}

export async function addMilestoneAction(conversationId: ObjectId, milestoneId: ObjectId, action: string): Promise<ObjectId> {
  const actionId = new ObjectId()
  await ConversationsDao.updateOne(
    {
      _id: conversationId,
      'userMilestones._id': milestoneId,
    },
    {
      $push: {
        'userMilestones.$.actions': {
          _id: actionId,
          action
        }
      }
    }
  )

  return actionId
}

export async function editMilestone(conversationId: ObjectId, milestoneId: ObjectId, milestone: string): Promise<ObjectId> {
  await ConversationsDao.updateOne(
    {
      _id: conversationId,
      'userMilestones._id': milestoneId,
    },
    {
      $set: {
        'userMilestones.$.milestone': milestone
      }
    }
  )

  return milestoneId
}

export async function editMilestoneAction(conversationId: ObjectId, milestoneId: ObjectId, actionId: ObjectId, action: string, isDone?: boolean) {
  const isDoneCondition = isDone !== undefined ? { "userMilestones.$[milestone].actions.$[action].isDone": isDone } : {}

  return ConversationsDao.updateOne(
    {
      _id: conversationId
    },
    { $set: { "userMilestones.$[milestone].actions.$[action].action": action, ...isDoneCondition } },
    { arrayFilters: [{ "milestone._id": milestoneId }, { "action._id": actionId }] }
  )
}

export async function updateSuggestedMilestone(conversationId: ObjectId, milestoneId: ObjectId, isSuggested: boolean = true) {
  return ConversationsDao.updateOne(
    {
      _id: conversationId,
      'milestoneSuggestions.milestones._id': milestoneId
    },
    {
      $set: {
        'milestoneSuggestions.milestones.$.isSuggested': isSuggested
      }
    }
  )
}

export async function updateSmartQuestionAnswer(conversationId: ObjectId, question: string, answer: string, answerUserId: ObjectId) {
  return ConversationsDao.updateOne(
    {
      _id: conversationId,
      'smartQuestions.content': question.trim()
    },
    {
      $set: {
        'smartQuestions.$.answer': answer,
        'smartQuestions.$.answerUserId': answerUserId
      }
    }
  )
}

export async function getConversationById(conversationId: ObjectId): Promise<Conversation | null> {
  const result = await ConversationsDao.findById(conversationId)
  if (!result) return null

  return result
}

export async function getConversationByType(type: string, meta: any): Promise<Conversation | null> {
  const result = await ConversationsDao.findByType(type, meta)
  if (!result) return null

  return result
}

export async function generateFirstMessages(conversationType: string, locale: string): Promise<I18n[]> {
  switch (conversationType) {
    case ConversationTypeObjective:
      return I18nDao.getByCode(I18nDbCodeGoalFirstMessage, locale)

    case ConversationTypeWeek:
      return I18nDao.getByCode(I18nDbCodeWeekFirstMessage, locale)

    default:
      return []
  }
}
