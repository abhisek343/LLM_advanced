/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/../../frontend_mvp_tests'], // Relative path
  moduleNameMapper: {
    // Handle CSS modules (if you use them)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle static assets
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/../frontend_mvp_tests/__mocks__/fileMock.js',
    // Alias to resolve imports from the src directory correctly
    '^@/(.*)$': '<rootDir>/src/$1',
    // If your tests import directly from frontend/llm-interviewer-ui/src, ensure paths are correct
    // This might be needed if tests have paths like '../../../frontend/llm-interviewer-ui/src/services/authAPI'
    // Adjust if your imports are structured differently or if @/ above covers it.
    '^frontend/llm-interviewer-ui/src/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Point to the new setup file
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json', // Point to the test-specific tsconfig
      },
    ],
  },
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
};
