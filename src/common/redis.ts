import Redis from 'ioredis'

let redis: Redis = null

export function getClient() {
  try {
    if (redis) {
      return redis
    }

    const url = `${process.env.REDIS_SCHEME}://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_ENDPOINT}:${process.env.REDIS_PORT}`
    console.info('connecting to redis server: ' + process.env.REDIS_ENDPOINT)

    redis = new Redis(url)

    return redis
  }
  catch (error) {
    console.error(error)
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
