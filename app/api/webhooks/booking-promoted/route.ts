import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPromotionEmail } from '@/lib/email'
import type { Database } from '@/lib/types'

// Webhook secret to verify requests are from Supabase
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET

interface WebhookPayload {
    type: 'UPDATE'
    table: 'bookings'
    schema: 'public'
    record: {
        id: string
        user_id: string
        day_id: string
        status: 'confirmed' | 'waitlist' | 'cancelled'
        created_at: string
        updated_at: string
        checked_in: boolean
        checked_in_at: string | null
    }
    old_record: {
        id: string
        user_id: string
        day_id: string
        status: 'confirmed' | 'waitlist' | 'cancelled'
        created_at: string
        updated_at: string
        checked_in: boolean
        checked_in_at: string | null
    }
}

export async function POST(request: NextRequest) {
    try {
        // Verify webhook secret (optional but recommended for security)
        const authHeader = request.headers.get('authorization')
        if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
            console.error('Unauthorized webhook request')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = (await request.json()) as WebhookPayload

        // Validate this is the correct event type
        if (payload.type !== 'UPDATE' || payload.table !== 'bookings') {
            return NextResponse.json({ message: 'Ignored - not a booking update' })
        }

        // Check if this is a promotion from waitlist to confirmed
        const wasWaitlisted = payload.old_record.status === 'waitlist'
        const isNowConfirmed = payload.record.status === 'confirmed'

        if (!wasWaitlisted || !isNowConfirmed) {
            return NextResponse.json({ message: 'Ignored - not a promotion event' })
        }

        // Create Supabase client with service role
        const supabase = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Get user profile information
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', payload.record.user_id)
            .single<{ email: string; full_name: string | null }>()

        if (profileError || !profile) {
            console.error('Failed to fetch user profile:', profileError)
            return NextResponse.json(
                { error: 'Failed to fetch user profile' },
                { status: 500 }
            )
        }

        // Build the cancel URL
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const cancelUrl = `${siteUrl}/dashboard`

        // Send the promotion email
        await sendPromotionEmail({
            to: profile.email,
            userName: profile.full_name || 'Student',
            date: payload.record.day_id,
            cancelUrl
        })

        console.log(`Promotion email sent to ${profile.email} for date ${payload.record.day_id}`)

        return NextResponse.json({
            success: true,
            message: 'Promotion email sent successfully'
        })

    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
