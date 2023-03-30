import jwt from 'jsonwebtoken'
import consts from '@common/consts'

export default {
  generateJwtToken: _id => jwt.sign({ _id }, process.env.JWT_KEY, { expiresIn: consts.tokenExpiresIn }),
}
