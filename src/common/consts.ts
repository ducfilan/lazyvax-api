import { ObjectId } from 'mongodb'

export default {
  tokenExpiresIn: '7d',
  tagsSelectLimit: 10,
}

export const AppName = "Lazyvax"
export const AppDomain = "https://lazyvax.com"

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
export const ObjectivesCollectionName = 'objectives'
export const EventsCollectionName = 'events'

export const LoginTypes = {
  google: 'google'
}

export const BaseCollectionProperties = () => ({
  lastUpdated: new Date(),
  delFlag: false
})

export const GetUserInfoUrl = (accessToken: string) => `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
export const CaptchaVerificationUrl = (response) => `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${response}`;

export const DoSpaceName = 'lazyvax-static'
export const DoEndpoint = 'sgp1.digitaloceanspaces.com'
export const DoPreSignExpirationInSecond = 600 // 10 minutes

export const StaticBaseUrl = 'https://static.lazyvax.com'
export const SupportingContentTypes = ['image/jpeg', 'image/png']

export const MaxPaginationLimit = 100
export const DefaultMostItemsInteractionsLimit = 5
export const MaxRegistrationsStep = 8
export const GoalMaxLength = 255
export const StudyCourseLength = 255
export const OccupationLength = 255
export const AgeGroupMaxLength = 10
export const MaxInt = 2147483647

export const AscOrder = 'asc'
export const DescOrder = 'desc'

export const CacheKeyUser = (id: string) => `user:${id}`
export const CacheKeyConversation = (id: string) => `conversation:${id}`

export const CacheTypes = []

export const AiProviderOpenAi = 'openai'

export const AiModeCompletion = 'completion'
export const AiModeChat = 'chat'

export const TargetPlatformWeb = "web"

export const TargetPlatformToHost = {
  [TargetPlatformWeb]: process.env.CLIENT_HOST_WEB,
  chrome: process.env.CLIENT_HOST_CHROME_EXT,
  edge: process.env.CLIENT_HOST_EDGE_EXT,
}

export const Env = process.env.NODE_ENV || 'dev'
export const Envs = {
  dev: 'dev',
  prod: 'prod'
}
export const ConversationTypeWeek = 'week'
export const ConversationTypeDay = 'day'
export const ConversationTypeMonth = 'month'
export const ConversationTypeObjective = 'objective'
export const ConversationTypeAll = 'all'
export const ConversationTypes = [
  ConversationTypeWeek, ConversationTypeDay, ConversationTypeMonth, ConversationTypeObjective, ConversationTypeAll
]

export const OAuth2TokenReceiver = (host: string, targetPlatform: string) => {
  if (targetPlatform === TargetPlatformWeb) {
    return `${host}?step=${RegisterStep}`
  }

  return `${host}/pages/oauth.html`
}

export const MessageTypeBeforeLogin = 1
export const MessageTypePlainText = 2
export const MessageTypeAskQuestionnaires = 3
export const MessageTypeRunningText = 4
export const MessageTypeStateGoal = 5
export const MessageTypeAskUserSmartQuestion = 6
export const MessageTypeAnswerSmartQuestion = 7
export const MessageTypeAskConfirmQuestionnaires = 8
export const MessageTypeSummaryQuestionnaires = 9
export const MessageTypeConfirmYesQuestionnaires = 10
export const MessageTypeConfirmNoQuestionnaires = 11
export const MessageTypeAckSummaryQuestionnaires = 12
export const MessageTypeSuggestMilestoneAndActions = 13
export const MessageTypeAddMilestoneAndActions = 14
export const MessageTypeNextMilestoneAndActions = 15
export const MessageTypeRetryGetResponse = 16
export const MessageTypeHardcodedMapping = 17
export const MessageTypeAskToGenerateWeekPlanFull = 18
export const MessageTypeConfirmToGenerateWeekPlanFull = 19
export const MessageTypes = [
  MessageTypeBeforeLogin, MessageTypePlainText, MessageTypeAskQuestionnaires,
  MessageTypeRunningText, MessageTypeStateGoal, MessageTypeAskUserSmartQuestion,
  MessageTypeAnswerSmartQuestion, MessageTypeAskConfirmQuestionnaires, MessageTypeSummaryQuestionnaires,
  MessageTypeConfirmYesQuestionnaires, MessageTypeConfirmNoQuestionnaires, MessageTypeAckSummaryQuestionnaires,
  MessageTypeSuggestMilestoneAndActions, MessageTypeAddMilestoneAndActions, MessageTypeNextMilestoneAndActions,
  MessageTypeRetryGetResponse, MessageTypeHardcodedMapping, MessageTypeAskToGenerateWeekPlanFull,
  MessageTypeConfirmToGenerateWeekPlanFull
]

export const MilestoneSourceSuggestion = 1
export const MilestoneSourceUser = 2
export const MilestoneSources = [MilestoneSourceSuggestion, MilestoneSourceUser]

export const BotUserId = new ObjectId('643d76223fa22a6c66c191c0')
export const BotUserName = 'Lava'

export const AgeGroups = ["< 18", "18-24", "25-34", "35-44", "45-54", "55-64", "> 65"]

export const I18nDbCodeFirstMessages = 'first-messages'
export const I18nDbCodeFirstConversationTitle = 'first-conversation-title'
export const I18nDbCodeFirstConversationDescription = 'first-conversation-description'
export const I18nDbCodeIntroduceHowItWorks = 'introduce-how-it-works'
export const I18nDbCodeGoalFirstMessage = 'goal-first-message'
export const I18nDbCodeWeekFirstMessage = 'week-first-message'
export const I18nDbCodeConfirmQuestionnaires = 'confirm-questionnaires'
export const I18nDbCodeSummarizeQuestionnaires = 'summarize-questionnaires'

export const RegisterStep = 1

export const ObjectiveTypes = ['life', 'long-term', 'short-term']

export const CalendarSourceGoogle = "Google"
export const CalendarSourceApp = AppName