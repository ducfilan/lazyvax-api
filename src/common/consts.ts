import { ObjectId } from 'mongodb'
import { LangCode } from './types'
import { getGreetingTime } from './utils/stringUtils'

export default {
  tokenExpiresIn: '7d',
  tagsSelectLimit: 10,
}

export const SupportingLanguages = ['ar', 'zh', 'nl', 'en', 'de', 'it', 'ja', 'ko', 'mn', 'pt', 'ru', 'sl', 'es', 'vi']
export const SupportingLanguagesMap = {
  ar: true,
  zh: true,
  nl: true,
  en: true,
  de: true,
  it: true,
  ja: true,
  ko: true,
  mn: true,
  pt: true,
  ru: true,
  sl: true,
  es: true,
  vi: true
}
export const DefaultLangCode = 'en'

export const SupportingUiLanguages = ['en', 'vi', 'zh', 'ja']

export const SupportingPages: { [brandName: string]: { key: string, title: string } } = {
  facebook: {
    key: 'facebook',
    title: 'Facebook',
  },
  youtube: {
    key: 'youtube',
    title: 'Youtube',
  },
  amazon: {
    key: 'amazon',
    title: 'Amazon',
  },
  ebay: {
    key: 'ebay',
    title: 'Ebay',
  },
  twitter: {
    key: 'twitter',
    title: 'Twitter',
  },
  reddit: {
    key: 'reddit',
    title: 'Reddit',
  },
  google: {
    key: 'google',
    title: 'Google',
  },
  pinterest: {
    key: 'pinterest',
    title: 'Pinterest',
  },
  messenger: {
    key: 'messenger',
    title: 'FB Messenger',
  },
}

export const SupportingPagesLength = Object.keys(SupportingPages).length

export const SupportingTopSetsTypes = {
  Global: 0,
  Category: 1
}

export const UsersCollectionName = 'users'
export const ConversationsCollectionName = 'conversations'
export const MessagesCollectionName = 'messages'
export const ConfigsCollectionName = 'configs'

export const LoginTypes = {
  google: 'google'
}

export const BaseCollectionProperties = () => ({
  lastUpdated: new Date(),
  delFlag: false
})

export const SupportingSetTypes = ['term-def', 'q&a', 'content']

export const CaptchaVerificationUrl = (response) => `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${response}`;

export const DoSpaceName = 'lazyvax-static'
export const DoEndpoint = 'sgp1.digitaloceanspaces.com'
export const DoPreSignExpirationInSecond = 600 // 10 minutes

export const StaticBaseUrl = 'https://static.lazyvax.com'
export const SupportingContentTypes = ['image/jpeg', 'image/png']

export const HttpStatusOk = 200
export const HttpStatusBadRequest = 400
export const HttpStatusUnauthorized = 401
export const HttpStatusForbidden = 403
export const HttpStatusInternalServer = 500

export const InteractionSubscribe = 'subscribe'
export const InteractionLike = 'like'
export const InteractionDislike = 'dislike'
export const SetInteractions = [InteractionSubscribe, InteractionLike, InteractionDislike]

export const MaxPaginationLimit = 100
export const DefaultMostItemsInteractionsLimit = 5
export const MaxRegistrationsStep = 2

export const AscOrder = 'asc'
export const DescOrder = 'desc'

export const CacheKeyUser = (email: string) => `user_${email}`

export const CacheTypeUserRandomSet = 'user-random-set'
export const CacheTypes = [CacheTypeUserRandomSet]

export const MaxInt = 2147483647

export const ExtensionIdChrome = 'fnobmpemmefaajmifmdkioliggjjfibj'
export const ExtensionIdEdge = 'caigmdkjonhkmnmglimmdkkgkomgkakl'
export const BrowserToExtensionId = {
  'chrome': ExtensionIdChrome,
  'edge': ExtensionIdEdge,
}

export const OAuth2TokenReceiver = (extensionId: string) => `chrome-extension://${extensionId}/pages/oauth.html`

export const ConversationTypeGoal = 'goal'

export const MessageTypePlainText = 2

export const BotUserId = new ObjectId('643d76223fa22a6c66c191c0')
export const BotUserName = 'Lava'

export function getFirstConversationTitle(locale: LangCode) {
  switch (locale) {
    case 'en':
      return 'Getting started with Lazyvax ❤️'

    case 'vi':
      return 'Làm quen với Lazyvax ❤️'

    case 'zh':
      return '开始使用Lazyvax ❤️'

    case 'ja':
      return 'Lazyvaxを使い始める ❤️'

    default:
      return 'Getting started with Lazyvax ❤️'
  }
}

export function getFirstConversationDescription(locale: LangCode) {
  switch (locale) {
    case 'en':
      return 'Welcome to Lazyvax! This is a beginner\'s guide to help you get started with the new journey!'

    case 'vi':
      return 'Chào mừng đến với Lazyvax! Đây là hướng dẫn cho người mới bắt đầu giúp bạn bắt đầu 1 hành trình mới!'

    case 'zh':
      return '欢迎来到 Lazyvax！这是一份初学者指南，帮助您开始新的旅程。'

    case 'ja':
      return 'Lazyvax へようこそ！このガイドは、新しい旅を始めるための初心者向けガイドです。'

    default:
      return 'Welcome to Lazyvax! This is a beginner\'s guide to help you get started with the new journey!'
  }
}

export function getFirstMessages(locale: LangCode): string[] {
  const greetingString = getGreetingTime(locale)

  switch (locale) {
    case 'en':
      return [
        `${greetingString} my friend! 🤗`,
        'You can call me ✨Lava✨',
        'Destiny has arranged me here to help you use your time better. Let\'s get to know each other really quick!'
      ]

    case 'vi': [
      `${greetingString} bạn nha! 🤗`,
      'Bạn hãy gọi mình là ✨Lava✨',
      'Định mệnh đã sắp xếp mình đến đây để giúp bạn sử dụng thời gian hiệu quả hơn, bạn ạ. Trước hết mình cùng hiểu thêm về nhau chút nha ^^!'
    ]

    case 'zh': [
      `${greetingString}我的朋友！ 🤗`,
      '你可以叫我✨Lava✨。',
      '命运把我安排在这里，是为了帮你更好地利用时间。\n让我们快速了解彼此。'
    ]

    case 'ja': [
      `${greetingString}、私の友人！ 🤗`,
      '✨Lava✨と呼んでください。',
      'あなたが時間をより有効に使えるように、私をここに配置しました. 早くお互いを知りましょう。'
    ]

    default: [
      `${greetingString} my friend! 🤗`,
      'You can call me ✨Lava✨',
      'Destiny has arranged me here to help you use your time better. Let\'s get to know each other really quick!'
    ]
  }
}
