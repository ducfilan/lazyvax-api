import { CreateConversationMessage, CreateConversationMessageConversation } from "@/common/types"
import { Conversation } from "@/entities/Conversation"
import { ObjectId } from "mongodb"
import { getUserById } from "../api/users.services"
import { ConversationTypeWeek } from "@/common/consts"

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

    conversation.meta = this.conversation.meta || {}

    return conversation
  }
}
