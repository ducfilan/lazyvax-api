import type { Config } from 'jest'
import { pathsToModuleNameMapper } from 'ts-jest'
import { compilerOptions } from './tsconfig.json'

const config: Config = {
  testEnvironment: 'node',
  globalSetup: './tests/config/setup.ts',
  globalTeardown: './tests/config/teardown.ts',
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/src' })
}

export default config
