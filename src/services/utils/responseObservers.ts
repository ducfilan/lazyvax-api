import { BotUserId, BotUserName, MessageTypeAskUserSmartQuestion, MessageTypeSuggestMilestoneAndActions } from "@/common/consts"
import { MilestoneSuggestion, SmartQuestion } from "@/models/Conversation"
import { Message } from "@/models/Message"
import { saveMessage } from "../api/messages.services"
import { updateById as updateConversationById } from "../api/conversations.services"


export interface IResponseObserver {
  work(question: any): void
}

export class FirstQuestionObserver implements IResponseObserver {
  constructor(private currentMessage: Message, private callback: Function) { }

  async work(smartQuestion: SmartQuestion) {
    const responseMessage: Message = {
      authorId: BotUserId,
      authorName: BotUserName,
      content: smartQuestion.content,
      conversationId: this.currentMessage.conversationId,
      type: MessageTypeAskUserSmartQuestion,
      timestamp: new Date(),
      parentId: this.currentMessage._id,
      parentContent: this.currentMessage.content,
    }

    const [_, messageId] = await Promise.all([
      updateConversationById(this.currentMessage.conversationId, { $push: { smartQuestions: smartQuestion } }),
      saveMessage(responseMessage)
    ])

    responseMessage._id = messageId

    this.callback(responseMessage)
  }
}

export class MilestoneSuggestionObserver implements IResponseObserver {
  private isRespondedToClient = false
  constructor(private currentMessage: Message, private callback: Function) { }

  async work(milestoneSuggestion: MilestoneSuggestion) {
    if (!this.isRespondedToClient) {
      await updateConversationById(this.currentMessage.conversationId, {
        $push: {
          'milestoneSuggestions.milestones': { ...milestoneSuggestion, isSuggested: true } as MilestoneSuggestion
        }
      })

      const responseMessage: Message = {
        authorId: BotUserId,
        authorName: BotUserName,
        content: JSON.stringify(milestoneSuggestion),
        conversationId: this.currentMessage.conversationId,
        type: MessageTypeSuggestMilestoneAndActions,
        timestamp: new Date(),
        parentId: this.currentMessage._id,
        parentContent: this.currentMessage.content,
      }

      !responseMessage.parentId && (delete responseMessage.parentId)

      responseMessage._id = await saveMessage(responseMessage)

      this.isRespondedToClient = true
      this.callback(responseMessage)
    } else {
      await updateConversationById(this.currentMessage.conversationId, {
        $push: {
          'milestoneSuggestions.milestones': milestoneSuggestion
        }
      })
    }
  }
}