module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/.'],
    testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.js'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/metaverse-2d/apps/http/src/$1'
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: {
                module: 'commonjs',
                esModuleInterop: true,
                allowSyntheticDefaultImports: true
            }
        }]
    },
    testTimeout: 10000
};