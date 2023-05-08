import { CreateNewGoalMessage } from "@/common/types"
import { Conversation } from "@/models/Conversation"
import { ObjectId } from "mongodb"
import { getUserById } from "../api/users.services"

export class ConversationBuilder {
  private goalMessage: CreateNewGoalMessage

  constructor(goalMessage: CreateNewGoalMessage) {
    this.goalMessage = goalMessage
  }

  async build(): Promise<Conversation> {
    const participants = await Promise.all(this.goalMessage.conversation.participants.map(async (p) => {
      const _id = new ObjectId(p.userId)
      const user = await getUserById(_id)

      return ({
        _id,
        name: user.name,
        pictureUrl: user.pictureUrl
      })
    }))

    return {
      description: this.goalMessage.conversation.description,
      title: this.goalMessage.conversation.title,
      participants,
      type: this.goalMessage.conversation.type,
      unreadCount: this.goalMessage.conversation.unreadCount,
      smartQuestions: []
    }
  }
}
