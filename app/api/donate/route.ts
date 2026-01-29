import { NextRequest, NextResponse } from 'next/server'
import { Client, Environment } from 'square'
import { createClient as createServerClient } from '@/lib/supabase/server' // Renamed for clarity
import { createClient as createAdminClient } from '@supabase/supabase-js' // Raw client for admin access
import { randomUUID } from 'crypto'

const isProduction = process.env.NODE_ENV === 'production'

const squareClient = new Client({
    environment: isProduction ? Environment.Production : Environment.Sandbox,
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
})

export async function POST(request: NextRequest) {
    try {
        const { sourceId, amount, email } = await request.json()

        if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID) {
            console.error('Missing Square configuration')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Amount comes in as dollars (e.g., 50.00), convert to cents (e.g., 5000)
        // Ensure it's BigInt compliant (integer)
        const amountCents = BigInt(Math.round(amount * 100))

        if (amount <= 0) {
            return NextResponse.json({ error: 'Invalid donation amount' }, { status: 400 })
        }

        try {
            const { result } = await squareClient.paymentsApi.createPayment({
                sourceId,
                idempotencyKey: randomUUID(),
                amountMoney: {
                    amount: amountCents,
                    currency: 'CAD',
                },
                buyerEmailAddress: email || undefined,
                locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
            })

            if (result.payment?.status === 'COMPLETED') {
                // Log successful donation to Supabase

                // 1. Get User ID if available (using standard auth)
                const supabaseAuth = await createServerClient()
                const { data: { user } } = await supabaseAuth.auth.getUser()

                // 2. Insert using SERVICE ROLE (Bypasses RLS)
                // We use the raw supabase-js client here because we need "root" access
                // to guarantee the log is written regardless of the user's login state.
                const supabaseAdmin = createAdminClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                )

                const { error: dbError } = await supabaseAdmin.from('donations').insert({
                    amount: amount,
                    currency: 'CAD',
                    payment_id: result.payment.id!,
                    status: result.payment.status,
                    email: email || user?.email || null,
                    user_id: user?.id || null
                })

                if (dbError) {
                    console.error('CRITICAL: Database Insert Error:', dbError)
                    // We continue even if DB log fails, as payment succeeded
                } else {
                    console.log('Donation logged successfully')
                }

                // Handle BigInt serialization for Square response
                const paymentData = JSON.parse(JSON.stringify(result.payment, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                ))

                return NextResponse.json({ success: true, payment: paymentData })
            } else {
                return NextResponse.json({
                    error: 'Payment failed',
                    details: result.payment?.status
                }, { status: 400 })
            }

        } catch (error: any) {
            console.error('Processing Error:', error)

            // Check if it's a Square API error
            if (error.errors && Array.isArray(error.errors)) {
                const message = error.errors.length > 0 ? error.errors[0].detail : 'Payment processing failed'
                return NextResponse.json({ error: message }, { status: 400 })
            }

            return NextResponse.json({ error: 'An unexpected error occurred processing payment' }, { status: 500 })
        }

    } catch (error) {
        console.error('Internal Server Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
