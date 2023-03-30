import UsersDao from '@dao/users.dao'
import { getEmailFromGoogleToken } from '@services/support/google-auth.service'
import { LoginTypes } from '@common/consts'

export default async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    const loginType = req.header('X-Login-Type')
    if (!token) return next()

    let email: string | null
    switch (loginType) {
      case LoginTypes.google:
        email = await getEmailFromGoogleToken(token)
        break

      default:
        return next()
    }

    if (!email) return next()

    const user = await UsersDao.findByEmail(email)

    if (!user) return next()

    req.user = user
    return next()
  } catch (error) {
    console.log(error)
    return next()
  }
}
