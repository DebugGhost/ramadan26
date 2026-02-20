import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data?.user) {
            const email = data.user.email

            // CRITICAL: Only allow approved university emails
            const ALLOWED_DOMAINS = ['@ualberta.ca', '@macewan.ca', '@nait.ca'];
            if (!email || !ALLOWED_DOMAINS.some(domain => email.endsWith(domain))) {
                // Sign out the user immediately
                await supabase.auth.signOut()

                // Redirect to home with error
                const errorUrl = new URL('/', origin)
                errorUrl.searchParams.set('error', 'non_ualberta_email')
                return NextResponse.redirect(errorUrl)
            }

            // Success - redirect to dashboard
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
