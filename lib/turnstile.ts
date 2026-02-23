'use server'

interface TurnstileVerifyResponse {
    success: boolean
    'error-codes'?: string[]
}

export async function verifyTurnstileToken(token: string): Promise<boolean> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY

    // In development, skip verification if no secret key is configured
    if (!secretKey) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Turnstile secret key not configured — skipping verification in dev mode')
            return true
        }
        console.error('TURNSTILE_SECRET_KEY is not set')
        return false
    }

    if (!token) {
        return false
    }

    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: secretKey,
                response: token,
            }),
        })

        const data: TurnstileVerifyResponse = await response.json()

        if (!data.success) {
            console.error('Turnstile verification failed:', data['error-codes'])
        }

        return data.success
    } catch (error) {
        console.error('Turnstile verification error:', error)
        return false
    }
}
