import { ObjectId } from "mongodb"

export type ConversationMemory = {
  _id?: ObjectId,
  conversationId: ObjectId,
  meta: {
    type: string,
    weekAiMemory: string,
    dayAiMemory: string[],
  }
}
