import fetch from 'node-fetch'
import { CaptchaVerificationUrl } from '@/common/consts/constants'
import { HttpBadRequest, HttpServerError } from '@common/http-codes'
import logger from '@/common/logger'

export default async (req, res, next) => {
  try {
    const captchaToken = req.body.captchaToken
    if (!captchaToken) throw new Error('Invalid captcha token provided!')

    const verifyUrl = CaptchaVerificationUrl(captchaToken)
    const response = await fetch(verifyUrl)
    const { success }: any = await response.json()

    if (success) {
      next()
    } else {
      res.status(HttpBadRequest).send({ error: 'Bad Request' })
    }
  } catch (error) {
    logger.error(error)
    res.status(HttpServerError).send({ error: 'Server Error' })
  }
}
