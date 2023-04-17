import { ObjectId } from "mongodb"

export type Message = {
  _id?: ObjectId,
  conversationId: ObjectId,
  authorId: ObjectId,
  type: number,
  authorName: string,
  content: string,
  timestamp: Date,
}
