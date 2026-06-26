module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/tests/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@actions/cache$': '<rootDir>/tests/__mocks__/cache.ts',
    '^@actions/core$': '<rootDir>/tests/__mocks__/core.ts',
    '^@actions/http-client$': '<rootDir>/tests/__mocks__/http-client.ts',
    '^@actions/tool-cache$': '<rootDir>/tests/__mocks__/tool-cache.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}', // Include all JS/TS files in /src
    '!src/**/*.d.ts' // Exclude type definition files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover']
}
