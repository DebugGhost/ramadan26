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

            // Log successful donation to Supabase
            if (result.payment?.status === 'COMPLETED') {
                const supabase = await createClient()

                // Try to link to user if logged in
                const { data: { user } } = await supabase.auth.getUser()

                await supabase.from('donations').insert({
                    amount: amount,
                    currency: 'CAD',
                    payment_id: result.payment.id!,
                    status: result.payment.status,
                    email: email || user?.email || null,
                    user_id: user?.id || null
                })

                return NextResponse.json({ success: true, payment: result.payment })
            } else {
                return NextResponse.json({
                    error: 'Payment failed',
                    details: result.payment?.status
                }, { status: 400 })
            }

        } catch (squareError: any) {
            console.error('Square API Error:', squareError)

            // Try to extract a friendly error message
            const errors = squareError.errors || []
            const message = errors.length > 0 ? errors[0].detail : 'Payment processing failed'

            return NextResponse.json({ error: message }, { status: 400 })
        }

    } catch (error) {
        console.error('Donation API Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
