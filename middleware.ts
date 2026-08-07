import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  // A revoked session (password rotated) has no user id — treat it as
  // logged-out so the user can reach /auth/signin and re-login.
  const isLoggedIn = !!req.auth?.user?.id
  const { pathname } = req.nextUrl

  // Rutas públicas (siempre accesibles sin autenticación)
  const isPublicRoute =
    pathname.startsWith("/auth/signin") ||
    pathname.startsWith("/auth/signup") ||
    pathname.startsWith("/auth/error")

  // Si no está autenticado y no es ruta pública → redirigir a signin
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/signin", req.nextUrl))
  }

  // Si está autenticado y visita ruta pública → redirigir a home
  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
