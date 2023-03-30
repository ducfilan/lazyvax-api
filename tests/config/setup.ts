
import { Config } from '@jest/types'

const setup = async function (globalConfig: Config.GlobalConfig, projectConfig: Config.ProjectConfig) {
  const OLD_ENV = process.env
  globalThis.OLD_ENV = OLD_ENV

  process.env = {
    ...OLD_ENV,
    MONGO_DB: `${OLD_ENV.MONGO_DB}_test`,
    NODE_PORT: "8081"
  }
}

export default setup