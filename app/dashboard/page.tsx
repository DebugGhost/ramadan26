import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'
import type { Booking, Day } from '@/lib/types'

export default async function DashboardPage() {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        redirect('/')
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Get today's date (MST/Edmonton timezone)
    const today = new Date().toLocaleDateString('en-CA') // Format: YYYY-MM-DD

    // Get today's day info
    const { data: todayDay } = await supabase
        .from('days')
        .select('*')
        .eq('date', today)
        .single()

    // Get user's booking for today (if any)
    const { data: todayBooking } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .eq('day_id', today)
        .in('status', ['confirmed', 'waitlist'])
        .maybeSingle()

    // Get capacity stats for today
    let capacityStats = {
        confirmed: 0,
        waitlist: 0,
        capacity_limit: 235,
    }

    if (todayDay) {
        const { data: bookings } = await supabase
            .from('bookings')
            .select('status')
            .eq('day_id', today)

        const confirmed = bookings?.filter(b => b.status === 'confirmed').length || 0
        const waitlist = bookings?.filter(b => b.status === 'waitlist').length || 0

        capacityStats = {
            confirmed,
            waitlist,
            capacity_limit: todayDay.capacity_limit,
        }
    }

    // Get all user's upcoming bookings
    const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select('*, days(*)')
        .eq('user_id', user.id)
        .gte('day_id', today)
        .in('status', ['confirmed', 'waitlist'])
        .order('day_id', { ascending: true })

    return (
        <DashboardClient
            user={user}
            profile={profile}
            todayDate={today}
            todayDay={todayDay}
            todayBooking={todayBooking as Booking | null}
            capacityStats={capacityStats}
            upcomingBookings={(upcomingBookings || []) as any[]}
        />
    )
}
