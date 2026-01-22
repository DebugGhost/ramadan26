
import { NextRequest, NextResponse } from 'next/server'
import { sendPromotionEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
        return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    try {
        await sendPromotionEmail({
            to: email,
            userName: 'Test User',
            date: '2026-03-15',
            cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
        })

        return NextResponse.json({ success: true, message: `Email sent to ${email}` })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
