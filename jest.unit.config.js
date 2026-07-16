export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(zustand|zod|@supabase)/)',
  ],
  collectCoverageFrom: [
    'src/domains/**/*.ts',
    'src/infrastructure/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
    '^@/components/(.*)$': '<rootDir>/src/shared/ui/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.unit.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};