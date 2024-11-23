import { CreateConversationMessage, CreateConversationMessageConversation } from "@/common/types/types"
import { Conversation } from "@/entities/Conversation"
import { ObjectId } from "mongodb"
import { getUserById } from "../api/users.services"
import { BotUserId, BotUserName, ConversationTypeWeek } from "@/common/consts/constants"
import { emitConversationMessage } from "../support/socket.io.service"
import { saveMessage } from "../api/messages.services"
import { Message } from "@/entities/Message"

export class ConversationBuilder {
  private conversation: CreateConversationMessageConversation

  constructor(conversationMessage: CreateConversationMessage) {
    this.conversation = conversationMessage.conversation
  }

  async build(): Promise<Conversation> {
    const participants = await Promise.all(this.conversation.participants.map(async (p) => {
      const _id = new ObjectId(p.userId)
      const user = await getUserById(_id)

      return ({
        _id,
        name: user.name,
        pictureUrl: user.pictureUrl
      })
    }))

    const conversation: Conversation = {
      participants,
      type: this.conversation.type,
      unreadCount: this.conversation.unreadCount,
    }

    switch (this.conversation.type) {
      case ConversationTypeWeek:
        this.conversation.meta.meta.startDate = new Date(this.conversation.meta.meta.startDate)
        break;

      default:
        break;
    }

    conversation.meta = this.conversation.meta as any || {}

    return conversation
  }
}

export const createChatMessage = (conversationId: ObjectId, content: string, type: number): Message => {
  return {
    conversationId,
    authorId: BotUserId,
    authorName: BotUserName,
    content,
    type,
    timestamp: new Date(),
  } as Message
}

export const sendMessage = async (conversationId: ObjectId, content: string, type: number) => {
  const chatMessage = createChatMessage(conversationId, content, type)
  const messageId = await saveMessage(chatMessage)
  if (messageId) {
    chatMessage._id = messageId
    emitConversationMessage(conversationId.toHexString(), chatMessage)
  }
}