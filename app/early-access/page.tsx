import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardClient from '@/app/dashboard/dashboard-client'
import type { Booking, Day } from '@/lib/types'
import { getTodayInEdmonton, getTomorrowInEdmonton, getCurrentHourInEdmonton } from '@/lib/date-utils'

export default async function EarlyAccessPage() {
    const supabase = await createClient()

    // 1. Check Authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        redirect('/auth/sign-in?next=/early-access')
    }

    // 2. Check Role (Admin or Early Access)
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    const hasAccess = profile?.role === 'early_access' || profile?.role === 'admin'

    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
                <div className="max-w-md text-center bg-slate-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
                    <h1 className="text-2xl font-bold mb-4 text-red-500">Access Denied</h1>
                    <p className="text-gray-400 mb-6">
                        You do not have permission to view this page. This early access portal is restricted to specific users.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                        Go to Main Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    // 3. Time Check (11am - 12pm)
    const currentHour = getCurrentHourInEdmonton()
    // Open if >= 11 (e.g., 11:00, 11:59).
    const isEarlyAccessTime = currentHour >= 11

    // If it is past 12pm, the regular dashboard is open.
    // Redirecting to /dashboard avoids confusion.
    if (currentHour >= 12) {
        redirect('/dashboard')
    }

    if (!isEarlyAccessTime) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
                <div className="max-w-md text-center bg-slate-900 border border-purple-900/30 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <svg className="w-24 h-24 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold mb-4 text-purple-400">Early Access Not Open Yet</h1>
                    <p className="text-gray-300 mb-6">
                        The early access portal opens at <span className="font-bold text-white">11:00 AM</span>.
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        Current Server Time Check: {currentHour}:00 (approx)
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors border border-gray-700"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    // ==============================================================================
    // LOAD DASHBOARD DATA (Copied from dashboard/page.tsx)
    // ==============================================================================

    // Get dates and timing logic
    const today = getTodayInEdmonton()
    const tomorrow = getTomorrowInEdmonton()

    // 1. Get Day Info for Today and Tomorrow
    const { data: days } = await supabase
        .from('days')
        .select('*')
        .in('date', [today, tomorrow])

    const todayDay = days?.find(d => d.date === today) || null
    const tomorrowDay = days?.find(d => d.date === tomorrow) || null

    // 2. Get User's Bookings for Today and Tomorrow
    const { data: userBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .in('day_id', [today, tomorrow])
        .in('status', ['confirmed', 'waitlist'])

    const todayBooking = userBookings?.find(b => b.day_id === today) || null
    const tomorrowBooking = userBookings?.find(b => b.day_id === tomorrow) || null

    // 3. Get Capacity Stats for Tomorrow
    let tomorrowStats = {
        confirmed: 0,
        waitlist: 0,
        capacity_limit: tomorrowDay?.capacity_limit || 235,
    }

    if (tomorrowDay) {
        const { data: bookings } = await supabase
            .from('bookings')
            .select('status')
            .eq('day_id', tomorrow)

        const confirmed = bookings?.filter(b => b.status === 'confirmed').length || 0
        const waitlist = bookings?.filter(b => b.status === 'waitlist').length || 0

        tomorrowStats = {
            confirmed,
            waitlist,
            capacity_limit: tomorrowDay.capacity_limit,
        }
    }

    // 4. Get all other upcoming bookings
    const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select('*, days(*)')
        .eq('user_id', user.id)
        .gt('day_id', tomorrow)
        .in('status', ['confirmed', 'waitlist'])
        .order('day_id', { ascending: true })

    // RENDER DASHBOARD CLIENT WITH FORCED OPEN REGISTRATION
    return (
        <div className="relative">
            {/* Early Access Banner */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 text-center py-2">
                <p className="text-amber-300 text-sm font-semibold tracking-wide uppercase">
                    Early Access Mode
                </p>
            </div>

            <DashboardClient
                user={user}
                profile={profile}
                todayDate={today}
                tomorrowDate={tomorrow}
                todayDay={todayDay}
                tomorrowDay={tomorrowDay}
                todayBooking={todayBooking as Booking | null}
                tomorrowBooking={tomorrowBooking as Booking | null}
                tomorrowStats={tomorrowStats}
                isRegistrationOpen={true} // FORCE OPEN
                upcomingBookings={(upcomingBookings || []) as any[]}
            />
        </div>
    )
}
