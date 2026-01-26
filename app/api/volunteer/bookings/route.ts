import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // Verify volunteer session
        const authCookie = request.cookies.get('volunteer_auth')
        if (!authCookie || authCookie.value !== 'authenticated') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const date = searchParams.get('date')

        if (!date) {
            return NextResponse.json(
                { error: 'Date parameter required' },
                { status: 400 }
            )
        }

        // Use service role client for full access (bypasses RLS)
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return [] },
                    setAll() { },
                },
            }
        )

        const { data, error } = await supabase
            .from('bookings')
            .select('*, profiles(*)')
            .eq('day_id', date)
            .eq('status', 'confirmed')
            .order('profiles(full_name)', { ascending: true })

        if (error) {
            console.error('Fetch bookings error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch bookings' },
                { status: 500 }
            )
        }

        return NextResponse.json({ bookings: data })
    } catch (error) {
        console.error('Fetch bookings exception:', error)
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        )
    }
}
