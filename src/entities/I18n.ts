import { LangCode, MessageType } from "@/common/types/types"
import { ObjectId } from "mongodb"

export type I18n = {
  _id?: ObjectId,
  code: string,
  order: number,
  type: string,
  needFormat?: boolean,
  messageType?: MessageType,
  locale: LangCode,
  content: string,
}
