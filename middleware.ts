/**
 * Next.js Middleware for route protection
 * Place in root as middleware.ts
 * Redirects unauthenticated users to login
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  // Define protected routes
  const protectedRoutes = ['/app/', '/admin/', '/api/']
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/']

  const pathname = request.nextUrl.pathname

  // Skip middleware for public routes and static files
  if (
    publicRoutes.some((route) => pathname === route || pathname.startsWith(route)) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))

  if (!isProtected) {
    return NextResponse.next()
  }

  try {
    // Get Supabase auth cookie - Supabase uses cookies like 'sb-<project-ref>-auth-token'
    const allCookies = request.cookies.getAll()
    const authCookie = allCookies.find((cookie) => 
      cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
    )

    if (!authCookie) {
      // No auth token, redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verify token with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        auth: { persistSession: false },
      }
    )

    const {
      data: { user },
      error
    } = await supabase.auth.getUser(authCookie.value)

    if (error || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // User is authenticated, allow request
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, redirect to login for safety
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
