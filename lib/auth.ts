import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { isSessionRevoked, revokeTokenPayload } from "@/lib/auth-security"
import { authorizeCredentials } from "@/lib/auth-credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      // authorize receives the original Web Request as its second argument
      // (verified against @auth/core 0.41.2 / next-auth 5.0.0-beta.31), which
      // authorizeCredentials uses to enforce the per-IP attempt limit.
      authorize: authorizeCredentials
    })
  ],
  callbacks: {
    async session({ session, token }) {
      // Revoked session (tokenVersion rotated after a password change):
      // strip the user so every `!session?.user` check fails closed and the
      // middleware treats the request as logged-out (re-login possible).
      if (!token.id) {
        return { ...session, user: undefined }
      }
      if (session.user) {
        if (token.id) session.user.id = token.id
        if (token.role) session.user.role = token.role
        session.user.language = token.language ?? null
        // JWT strategy pre-fills session.user.name from token.name, but set it
        // explicitly so the session always reflects the stored account name.
        if (token.name) session.user.name = token.name
      }
      return session
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.language = user.language ?? null
        token.tokenVersion = user.tokenVersion
      }
      // Apply client-side session updates (useSession().update) so name and
      // language changes reflect immediately without re-login. tokenVersion
      // is deliberately left untouched: it only changes via password rotation.
      if (trigger === "update" && session) {
        if (typeof session.name === "string") token.name = session.name
        if ("language" in session) token.language = session.language ?? null
      }
      // Session revocation: a password change bumps tokenVersion in the DB,
      // so every previously issued JWT (including the current one) becomes
      // stale. On each request without a fresh login, compare versions and
      // strip the identity when they differ, forcing a re-login. Tokens
      // issued before tokenVersion existed (legacy) use -1 so they mismatch
      // and get revoked once. Fail-open: a DB error keeps the token as-is so
      // the app stays available.
      if (!user && token.id) {
        if (await isSessionRevoked(token.id, token.tokenVersion ?? -1)) {
          return revokeTokenPayload(token)
        }
      }
      return token
    }
  },
  events: {
    async createUser({ user }) {
      console.warn(`New user created: ${user.email}`)
    }
  }
})
