import { CreateConversationGoalMessage } from "@/common/types"
import { Conversation } from "@/models/Conversation"
import { ObjectId } from "mongodb"
import { getUserById } from "../api/users.services"

export class ConversationBuilder {
  private conversationMessage: CreateConversationGoalMessage

  constructor(goalMessage: CreateConversationGoalMessage) {
    this.conversationMessage = goalMessage
  }

  async build(): Promise<Conversation> {
    const participants = await Promise.all(this.conversationMessage.conversation.participants.map(async (p) => {
      const _id = new ObjectId(p.userId)
      const user = await getUserById(_id)

      return ({
        _id,
        name: user.name,
        pictureUrl: user.pictureUrl
      })
    }))

    return {
      participants,
      type: this.conversationMessage.conversation.type,
      unreadCount: this.conversationMessage.conversation.unreadCount,
    }
  }
}
