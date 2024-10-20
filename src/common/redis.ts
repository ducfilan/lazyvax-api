import { Conversation } from '@/entities/Conversation'
import Redis from 'ioredis'
import { ObjectId } from 'mongodb'
import logger from './logger'

let redis: Redis = null

export function getClient() {
  try {
    if (redis) {
      return redis
    }

    logger.info('connecting to redis server: ' + process.env.REDIS_ENDPOINT)

    const tlsOptions = JSON.parse(process.env.REDIS_SECURE) ? { tls: {} } : {}
    const authOptions = process.env.REDIS_USERNAME ? {
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    } : {}

    redis = new Redis({
      host: process.env.REDIS_ENDPOINT,
      port: parseInt(process.env.REDIS_PORT),
      ...authOptions,
      ...tlsOptions,
    })

    return redis
  }
  catch (error) {
    logger.error(error)
  }
}

export async function setCache(key: string, value, options: any = {}, ignoreError = true) {
  try {
    const client = getClient()
    if (!client) return

    if (options.EX) {
      await client.set(key, JSON.stringify(value), 'EX', options.EX)
    } else {
      await client.set(key, JSON.stringify(value))
    }
  } catch (error) {
    if (!ignoreError) {
      throw error
    }
  }
}

export async function delCache(key: string) {
  const client = getClient()
  if (!client) throw new Error('client is not initialized')

  await client.del(key)
}

export async function delCacheByKeyPattern(keyPattern: string) {
  const client = getClient()

  let stream = client.scanStream({
    match: `${keyPattern}*`,
    count: 100
  })

  stream.on('data', function (resultKeys) {
    if (resultKeys.length) {
      client.unlink(resultKeys)
    }
  })
}

export async function getCache(key: string, ignoreError = true, fallbackValue = null) {
  try {
    const client = getClient()
    if (!client) return null

    const cachedValue = await client.get(key)
    if (!cachedValue) return fallbackValue

    return JSON.parse(cachedValue)
  } catch (error) {
    if (ignoreError) {
      return fallbackValue
    }

    throw error
  }
}

export async function getConversationCache(key: string, ignoreError = true, fallbackValue = null): Promise<Conversation | null> {
  const cachedConversation = await getCache(key, ignoreError, fallbackValue)
  if (!cachedConversation) return fallbackValue

  cachedConversation._id = new ObjectId(cachedConversation._id)
  cachedConversation.participants.forEach(p => {
    p._id && (p._id = new ObjectId(p._id))
  })

  cachedConversation.smartQuestions?.forEach(q => {
    q.answerUserId && (q.answerUserId = new ObjectId(q.answerUserId))
  })

  cachedConversation.milestoneSuggestions?.milestones?.forEach(m => {
    m._id && (m._id = new ObjectId(m._id))
  })

  cachedConversation.userMilestones?.forEach(m => {
    m._id && (m._id = new ObjectId(m._id))
    m.actions && m.actions.length && m.actions.forEach(a => {
      a._id && (a._id = new ObjectId(a._id))
    })
  })

  return cachedConversation as Conversation
}
