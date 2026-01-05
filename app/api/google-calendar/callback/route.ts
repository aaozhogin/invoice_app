import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_URL + '/api/google-calendar/callback' || 'http://localhost:3000/api/google-calendar/callback'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Check for OAuth errors
    if (error) {
      return NextResponse.redirect(
        `/google-calendar-sync?error=${encodeURIComponent(error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `/google-calendar-sync?error=no_code`
      )
    }

    // Verify state token
    const storedState = request.cookies.get('oauth_state')?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `/google-calendar-sync?error=invalid_state`
      )
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange error:', errorData)
      return NextResponse.redirect(
        `/google-calendar-sync?error=token_exchange_failed`
      )
    }

    const tokens = await tokenResponse.json()

    // Store tokens securely (in production, use encrypted database storage)
    // For now, we'll pass them back to the client to store in localStorage
    const response = NextResponse.redirect(
      `/google-calendar-sync?success=true&access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token || ''}`
    )

    // Clear the state cookie
    response.cookies.delete('oauth_state')

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      `/google-calendar-sync?error=callback_failed`
    )
  }
}
