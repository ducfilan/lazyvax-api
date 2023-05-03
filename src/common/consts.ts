import { ObjectId } from 'mongodb'

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

export const UsersCollectionName = 'users'
export const ConversationsCollectionName = 'conversations'
export const MessagesCollectionName = 'messages'
export const I18nCollectionName = 'i18n'
export const ConfigsCollectionName = 'configs'

export const LoginTypes = {
  google: 'google'
}

export const BaseCollectionProperties = () => ({
  lastUpdated: new Date(),
  delFlag: false
})

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

export const MaxPaginationLimit = 100
export const DefaultMostItemsInteractionsLimit = 5
export const MaxRegistrationsStep = 8
export const GoalMaxLength = 255
export const StudyCourseLength = 255
export const OccupationLength = 255
export const AgeGroupMaxLength = 10

export const AscOrder = 'asc'
export const DescOrder = 'desc'

export const CacheKeyUser = (identifier: string) => `user_${identifier}`

export const CacheTypes = []

export const MaxInt = 2147483647

export const ExtensionIdChrome = 'fnobmpemmefaajmifmdkioliggjjfibj'
export const ExtensionIdEdge = 'caigmdkjonhkmnmglimmdkkgkomgkakl'
export const BrowserToExtensionId = {
  'chrome': ExtensionIdChrome,
  'edge': ExtensionIdEdge,
}

export const OAuth2TokenReceiver = (extensionId: string) => `chrome-extension://${extensionId}/pages/oauth.html`

export const ConversationTypeGoal = 'goal'

export const MessageTypeBeforeLogin = 1
export const MessageTypePlainText = 2
export const MessageTypeAskQuestionnaires = 3
export const MessageTypeRunningText = 4
export const MessageTypes = [MessageTypeBeforeLogin, MessageTypePlainText, MessageTypeAskQuestionnaires, MessageTypeRunningText]

export const BotUserId = new ObjectId('643d76223fa22a6c66c191c0')
export const BotUserName = 'Lava'

export const AgeGroups = ["< 18", "18-24", "25-34", "35-44", "45-54", "55-64", "> 65"]

export const I18nDbCodeFirstMessages = 'first-messages'
export const I18nDbCodeFirstConversationTitle = 'first-conversation-title'
export const I18nDbCodeFirstConversationDescription = 'first-conversation-description'
export const I18nDbCodeIntroduceHowItWorks = 'introduce-how-it-works'
export const I18nDbCodeGoalFirstMessage = 'goal-first-message'
