import fetch from 'node-fetch'
import { CaptchaVerificationUrl } from '@common/consts'
import { HttpBadRequest, HttpServerError } from '@common/http-codes'

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
    console.log(error)
    res.status(HttpServerError).send({ error: 'Server Error' })
  }
}
