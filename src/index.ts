import 'module-alias/register'
import app from '@/app'
import { injectTables } from '@common/configs/mongodb-client.config'

import http from 'http'
import { registerSocketIo } from './services/support/socket.io.service'
import { registerAiServices } from './services/support/ai.services'
import { AiProviderOpenAi } from './common/consts'
import logger from './common/logger'

const port = process.env.NODE_PORT || 80

const server = http.createServer(app)

registerAiServices(AiProviderOpenAi)

injectTables()
  .catch(err => {
    logger.error(err.stack)
    process.exit(1)
  })
  .then(() => {
    registerSocketIo(server)

    server.listen(port, () => {
      logger.info(`listening on port ${port}`)
    })
  })
