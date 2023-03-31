import 'module-alias/register'
import app from '@/app'
import { injectTables } from '@common/configs/mongodb-client.config'


const port = process.env.NODE_PORT || 80

injectTables()
  .catch(err => {
    console.error(err.stack)
    process.exit(1)
  })
  .then(() => {
    app.listen(port, () => {
      console.log(`listening on port ${port}`)
    })
  })
