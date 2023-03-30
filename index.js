require('@babel/register')({ extensions: ['.js', '.ts'] })
require('dotenv').config()

exports = module.exports = require(process.env.NODE_ENV === 'dev' ? './src' : './build')
