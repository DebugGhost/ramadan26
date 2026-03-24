import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import ReportClient from './report-client'

export const dynamic = 'force-dynamic'

export default async function ReportPage() {
    const supabase = await createClient()

    // 1. Check Authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        redirect('/auth/sign-in')
    }

    // 2. Check Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                    <p className="text-gray-400">You do not have permission to view this page.</p>
                </div>
            </div>
        )
    }

    // 3. Fetch all data using service role (bypass RLS)
    const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const [
        { data: bookings },
        { data: profiles },
        { data: days },
        { data: donations },
    ] = await Promise.all([
        supabaseAdmin.from('bookings').select('id, user_id, day_id, status, created_at, checked_in, checked_in_at'),
        supabaseAdmin.from('profiles').select('id, gender, referral_source, created_at'),
        supabaseAdmin.from('days').select('date, capacity_limit').order('date', { ascending: true }),
        supabaseAdmin.from('donations').select('id, amount, status, created_at').eq('status', 'COMPLETED'),
    ])

    return (
        <ReportClient
            bookings={bookings || []}
            profiles={profiles || []}
            days={days || []}
            donations={donations || []}
        />
    )
}
