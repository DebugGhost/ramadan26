import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { pin } = await request.json()

        // Verify PIN against environment variable
        const correctPin = process.env.VOLUNTEER_PIN

        if (!correctPin) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        }

        if (pin === correctPin) {
            // Create a success response
            const response = NextResponse.json({ success: true })

            // Set a session cookie (simple auth, valid for 12 hours)
            response.cookies.set('volunteer_auth', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 12, // 12 hours
                path: '/',
            })

            return response
        } else {
            return NextResponse.json(
                { error: 'Incorrect PIN' },
                { status: 401 }
            )
        }
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        )
    }
}
