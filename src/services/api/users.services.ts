import { ObjectId } from 'mongodb'
import UsersDao from '@dao/users.dao'
import { isGoogleTokenValid } from '@services/support/google-auth.service'
import { LoginTypes, SupportingLanguagesMap, DefaultLangCode, CacheKeyUser } from '@/common/consts/constants'
import { getCache, setCache } from '@common/redis'
import { User } from '@/entities/User'

export async function getUserById(userId: ObjectId) {
  const cacheKeyId = CacheKeyUser(userId.toHexString())
  let user = await getCache(cacheKeyId) as User

  if (user) {
    user._id = new ObjectId(user._id)
  } else {
    user = await UsersDao.findOne({ _id: userId })
    if (!user) return null

    const cacheKeyId = CacheKeyUser(user._id.toHexString())
    await Promise.all([setCache(cacheKeyId, user), setCache(cacheKeyId, user)])
  }

  return user
}

export async function getUserByEmail(email: string) {
  const cacheKeyEmail = CacheKeyUser(email)
  let user = await getCache(cacheKeyEmail) as User

  if (user) {
    user._id = new ObjectId(user._id)
  } else {
    user = await UsersDao.findByEmail(email)
    if (!user) return null

    const cacheKeyId = CacheKeyUser(user._id.toHexString())
    await Promise.all([setCache(cacheKeyEmail, user), setCache(cacheKeyId, user)])
  }

  return user
}

export async function register(requestBody): Promise<ObjectId> {
  let { type, serviceAccessToken, finishedRegisterStep,
    name, email, locale, picture: pictureUrl
  } = requestBody

  // TODO: Fixed en first.
  //locale = locale.substring(0, 2)
  locale = DefaultLangCode
  locale = SupportingLanguagesMap[locale] ? locale : DefaultLangCode

  let userInfo = {
    type,
    serviceAccessToken,
    finishedRegisterStep,
    name,
    email,
    locale,
    pictureUrl,
  } as User

  switch (type) {
    case LoginTypes.google:
      const isTokenValid = await isGoogleTokenValid(serviceAccessToken, email)
      if (!isTokenValid)
        throw new Error('Invalid token')

      break

    default:
      throw Error('Not supported register type!')
  }

  return UsersDao.registerUserIfNotFound(userInfo)
}

export async function update({ _id, email }: User, updateItems) {
  return UsersDao.updateOne({ _id, email }, { $set: updateItems })
}

export async function updateDob({ _id, email }: User, dob: Date) {
  return UsersDao.updateOne({ _id, email }, { $set: { 'preferences.dob': dob } })
}

export async function updateTimezone({ _id, email }: User, timezone: string) {
  return UsersDao.updateOne({ _id, email }, { $set: { 'preferences.timezone': timezone } })
}

export async function logout({ _id, email }) {
}

export default {
  register,
  getUserById,
  getUserByEmail,
  update,
  updateDob,
  updateTimezone,
  logout,
}
