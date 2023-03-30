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
    key: "facebook",
    title: "Facebook",
  },
  youtube: {
    key: "youtube",
    title: "Youtube",
  },
  amazon: {
    key: "amazon",
    title: "Amazon",
  },
  ebay: {
    key: "ebay",
    title: "Ebay",
  },
  twitter: {
    key: "twitter",
    title: "Twitter",
  },
  reddit: {
    key: "reddit",
    title: "Reddit",
  },
  google: {
    key: "google",
    title: "Google",
  },
  pinterest: {
    key: "pinterest",
    title: "Pinterest",
  },
  messenger: {
    key: "messenger",
    title: "FB Messenger",
  },
}

export const SupportingPagesLength = Object.keys(SupportingPages).length

export const SupportingTopSetsTypes = {
  Global: 0,
  Category: 1
}

export const UsersCollectionName = 'users'
export const SetsCollectionName = 'sets'
export const TopSetsCollectionName = 'topSets'
export const InteractionsCollectionName = 'interactions'
export const ItemsInteractionsCollectionName = 'itemsInteractions'
export const ItemsStatisticsCollectionName = 'itemsStatistics'
export const SetsStatisticsCollectionName = 'setsStatistics'
export const MissionsCollectionName = 'missions'
export const CategoriesCollectionName = 'categories'
export const ConfigsCollectionName = 'configs'
export const TagsCollectionName = 'tags'

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

export const ItemsInteractionShow = 'show'
export const ItemsInteractionNext = 'next'
export const ItemsInteractionPrev = 'prev'
export const ItemsInteractionIgnore = 'ignore'
export const ItemsInteractionForcedDone = 'forced-done'
export const ItemsInteractionAnswerCorrect = 'answer-correct'
export const ItemsInteractionAnswerIncorrect = 'answer-incorrect'
export const ItemsInteractionStar = 'star'
export const ItemsInteractionReviewStar = 'review-star'
export const ItemsInteractionFlip = 'flip'
export const ItemsInteractions = [ItemsInteractionShow, ItemsInteractionNext, ItemsInteractionPrev, ItemsInteractionAnswerCorrect, ItemsInteractionAnswerIncorrect, ItemsInteractionIgnore, ItemsInteractionForcedDone, ItemsInteractionStar, ItemsInteractionFlip, ItemsInteractionReviewStar]

export const MaxPaginationLimit = 100
export const DefaultMostItemsInteractionsLimit = 5
export const MaxRegistrationsStep = 2

export const AscOrder = 'asc'
export const DescOrder = 'desc'

export const CacheKeyRandomSetPrefix = (userId: string, interaction: string) => `randomSet_${userId}_${interaction}`
export const CacheKeyRandomSet = (userId: string, interactions: string[], itemsSkip: number, itemsLimit: number) => `randomSet_${userId}_${interactions.join('-')}_${itemsSkip}_${itemsLimit}`
export const CacheKeySetPrefix = (setId: string) => `set_${setId}_`
export const CacheKeySet = (setId: string, itemsSkip: number, itemsLimit: number) => `set_${setId}_${itemsSkip}_${itemsLimit}`
export const CacheKeyUser = (email: string) => `user_${email}`
export const CacheKeySuggestSet = (userId: string, keyword: string, skip: number, limit: number, languages: string[]) => `suggestSet_${userId}_${keyword}_${skip}_${limit}_${languages.join()}`

export const CacheTypeUserRandomSet = "user-random-set"
export const CacheTypes = [CacheTypeUserRandomSet]

export const MaxInt = 2147483647

export const ExtensionIdChrome = "pgnilfdgiaibihnlphdkbcnnbmbffodd"
export const ExtensionIdEdge = "caigmdkjonhkmnmglimmdkkgkomgkakl"
export const BrowserToExtensionId = {
  "chrome": ExtensionIdChrome,
  "edge": ExtensionIdEdge,
}

export const OAuth2TokenReceiver = (extensionId: string) => `chrome-extension://${extensionId}/pages/oauth.html`