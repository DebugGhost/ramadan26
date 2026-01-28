import { NextRequest, NextResponse } from 'next/server'
import { Client, Environment } from 'square'
import { createClient } from '@/lib/supabase/server'
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
                const supabase = await createClient()

                // Try to link to user if logged in
                const { data: { user } } = await supabase.auth.getUser()

                const { error: dbError } = await supabase.from('donations').insert({
                    amount: amount,
                    currency: 'CAD',
                    payment_id: result.payment.id!,
                    status: result.payment.status,
                    email: email || user?.email || null,
                    user_id: user?.id || null
                })

                if (dbError) {
                    console.error('Database Insert Error:', dbError)
                    // We continue even if DB log fails, as payment succeeded
                }

                // Handle BigInt serialization for Square response
                // Next.js JSON serialization fails with BigInt, so we convert to string
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

            // Otherwise generic error
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
