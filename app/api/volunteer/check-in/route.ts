import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

export async function POST(request: NextRequest) {
    try {
        // Verify volunteer session
        const authCookie = request.cookies.get('volunteer_auth')
        if (!authCookie || authCookie.value !== 'authenticated') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { bookingId, checkedIn } = await request.json()

        if (!bookingId || typeof checkedIn !== 'boolean') {
            return NextResponse.json(
                { error: 'Invalid request data' },
                { status: 400 }
            )
        }

        // Use service role client for full access (bypasses RLS)
        const supabase = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        )

        // Update check-in status
        const { data, error } = await supabase
            .from('bookings')
            .update({
                checked_in: checkedIn,
                checked_in_at: checkedIn ? new Date().toISOString() : null,
            })
            .eq('id', bookingId)
            .select()
            .single()

        if (error) {
            console.error('Check-in error:', error)
            return NextResponse.json(
                { error: 'Failed to update check-in status' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Check-in exception:', error)
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        )
    }
}
