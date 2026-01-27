import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTodayInEdmonton } from '@/lib/date-utils'

export async function POST(request: NextRequest) {
    try {
        const { pin } = await request.json()
        const supabase = await createClient()

        // Get today's date in Edmonton
        const today = getTodayInEdmonton()

        // Fetch the PIN for today from the database
        const { data: day, error } = await supabase
            .from('days')
            .select('volunteer_pin')
            .eq('date', today)
            .single()

        if (error || !day) {
            console.error('Error fetching today\'s PIN:', error)
            return NextResponse.json(
                { error: 'Could not retrieve daily configuration' },
                { status: 500 }
            )
        }

        const correctPin = day.volunteer_pin

        if (!correctPin) {
            console.error('No PIN configured for today')
            return NextResponse.json(
                { error: 'No PIN configured for today' },
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
        console.error('Verify PIN exception:', error)
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        )
    }
}
