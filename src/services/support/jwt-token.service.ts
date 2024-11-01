import jwt from 'jsonwebtoken'
import consts from '@/common/consts/constants'

export default {
  generateJwtToken: _id => jwt.sign({ _id }, process.env.JWT_KEY, { expiresIn: consts.tokenExpiresIn }),
}
