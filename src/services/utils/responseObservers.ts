import { LavaUserId, LavaUserName } from "@/common/consts/constants"
import { MilestoneSuggestion, SmartQuestion } from "@/entities/Conversation"
import { Message } from "@/entities/Message"
import { saveMessage } from "../api/messages.services"
import { updateById as updateConversationById } from "../api/conversations.services"
import { emitWaitResponse } from "../support/socket.io.service"
import { MessageTypeAnswerSmartQuestion, MessageTypeSuggestMilestoneAndActions } from "@/common/consts/message-types"


export interface IResponseObserver {
  work(data: any): void
}

export class FirstQuestionObserver implements IResponseObserver {
  constructor(private currentMessage: Message, private callback: Function) { }

  async work(smartQuestion: SmartQuestion) {
    const responseMessage: Message = {
      authorId: LavaUserId,
      authorName: LavaUserName,
      content: JSON.stringify(smartQuestion),
      conversationId: this.currentMessage.conversationId,
      type: MessageTypeAnswerSmartQuestion,
      timestamp: new Date(),
      parentId: this.currentMessage._id,
      parentContent: this.currentMessage.content,
    }

    const [_, messageId] = await Promise.all([
      updateConversationById(this.currentMessage.conversationId, { $push: { smartQuestions: smartQuestion } }),
      saveMessage(responseMessage)
    ])

    if (messageId) {
      responseMessage._id = messageId
      this.callback(responseMessage)
    }
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
        authorId: LavaUserId,
        authorName: LavaUserName,
        content: JSON.stringify(milestoneSuggestion),
        conversationId: this.currentMessage.conversationId,
        type: MessageTypeSuggestMilestoneAndActions,
        timestamp: new Date(),
        parentId: this.currentMessage._id,
        parentContent: this.currentMessage.content,
      }

      !responseMessage.parentId && (delete responseMessage.parentId)

      const messageId = await saveMessage(responseMessage)
      if (messageId) {
        responseMessage._id = messageId

        this.isRespondedToClient = true
        this.callback(responseMessage)
      }
    } else {
      await updateConversationById(this.currentMessage.conversationId, {
        $push: {
          'milestoneSuggestions.milestones': milestoneSuggestion
        }
      })
    }
  }
}

export class WaitResponseObserver implements IResponseObserver {
  constructor(private currentMessage: Message, private callback: Function) { }

  work(messageType: any): void {
    emitWaitResponse(this.currentMessage.authorId.toHexString(), messageType)
  }
}

export class DoNothingObserver implements IResponseObserver {
  constructor(private callback: Function) { }

  work(data: any): void {
    this.callback(data)
  }
}