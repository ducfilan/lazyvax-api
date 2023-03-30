import { Config } from '@jest/types'

const teardown = async function (globalConfig: Config.GlobalConfig, projectConfig: Config.ProjectConfig) {
  process.env = globalThis.OLD_ENV
}

export default teardown