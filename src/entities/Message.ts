import { ObjectId } from "mongodb"
import { I18n } from "./I18n"
import { BotUserId, BotUserName } from "@/common/consts/constants"
import { formatString } from "@/common/utils/stringUtils"

export type Message = {
  _id?: ObjectId,
  conversationId: ObjectId,
  authorId: ObjectId,
  type: number,
  authorName: string,
  content: string,
  parentContent?: string,
  parentId?: ObjectId,
  isResponded?: boolean,
  timestamp: Date,
}

/**
 * Build group of messages from i18ns.
 */
export class MessageGroupBuilder {
  i18ns: I18n[]
  orderToFormatArgs: { [key: number]: string[] }

  constructor(messages: I18n[], orderToFormatArgs?: { [key: number]: string[] }) {
    this.i18ns = messages
    this.orderToFormatArgs = orderToFormatArgs
  }

  /**
   * Build group of messages from i18ns.
   * @param conversationId id of the conversation
   * @param authorId id of the author
   * @param authorName name of the author
   * @returns list of messages
   */
  build(conversationId: ObjectId, authorId: ObjectId = BotUserId, authorName: string = BotUserName): Message[] {
    this.i18ns.sort((m1, m2) => m1.order - m2.order)

    return this.i18ns.map((i18n) => ({
      authorId,
      authorName,
      content: i18n.needFormat ? formatString(i18n.content, this.orderToFormatArgs[i18n.order]) : i18n.content,
      conversationId,
      timestamp: new Date(),
      type: i18n.messageType,
    }))
  }
}
