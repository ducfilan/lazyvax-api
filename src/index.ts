import 'module-alias/register'
import app from '@/app'
import { injectTables } from '@common/configs/mongodb-client.config'

import http from 'http'
import { registerSocketIo } from './services/support/socket.io.service'

const port = process.env.NODE_PORT || 80

const server = http.createServer(app)


injectTables()
  .catch(err => {
    console.error(err.stack)
    process.exit(1)
  })
  .then(() => {
    registerSocketIo(server)

    server.listen(port, () => {
      console.log(`listening on port ${port}`)
    })
  })
