const { withDevkit } = require('miaoda-expo-devkit/jest');
/** @type {import('jest').Config} */
module.exports = withDevkit({
  preset: 'jest-expo',
  setupFilesAfterSetup: ['./src/test/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@unimodules|react-native-.*|@react-navigation/.*|@sentry/.*|@supabase/.*|nativewind|react-native-css-interop|@rn-primitives/.*|lucide-react-native)/)',
  ],
});
