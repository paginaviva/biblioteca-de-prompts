import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      // Optional: a revoked session (password rotated) has no identity.
      id?: string
      role?: string
      language?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    language?: string | null
    tokenVersion?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    language?: string | null
    tokenVersion?: number
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string
    role?: string
    language?: string | null
    tokenVersion?: number
  }
}
