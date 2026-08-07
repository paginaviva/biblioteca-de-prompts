// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock next-auth
jest.mock('next-auth', () => ({
  NextAuth: jest.fn(() => ({
    handlers: {
      GET: jest.fn(),
      POST: jest.fn(),
    },
    signIn: jest.fn(),
    signOut: jest.fn(),
    auth: jest.fn(),
  })),
  default: jest.fn(() => ({
    handlers: {
      GET: jest.fn(),
      POST: jest.fn(),
    },
    signIn: jest.fn(),
    signOut: jest.fn(),
    auth: jest.fn(),
  })),
}))

jest.mock('next-auth/providers/credentials', () => ({
  default: jest.fn(() => ({
    credentials: {},
    authorize: jest.fn(),
  })),
}))

jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(),
}))


