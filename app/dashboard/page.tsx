import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'
import type { Booking, Day } from '@/lib/types'
import { getTodayInEdmonton, getTomorrowInEdmonton, getCurrentHourInEdmonton } from '@/lib/date-utils'

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

    // Get dates and timing logic
    const today = getTodayInEdmonton()
    const tomorrow = getTomorrowInEdmonton()
    const currentHour = getCurrentHourInEdmonton()

    // Registration for tomorrow opens at 12:00 PM (noon) Today
    const isRegistrationOpen = currentHour >= 12

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

    // 3. Get Capacity Stats for Tomorrow (for the Main Card)
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

    // 4. Get all other upcoming bookings (Day after Tomorrow onwards)
    const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select('*, days(*)')
        .eq('user_id', user.id)
        .gt('day_id', tomorrow) // Bookings AFTER tomorrow
        .in('status', ['confirmed', 'waitlist'])
        .order('day_id', { ascending: true })

    return (
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
            isRegistrationOpen={isRegistrationOpen}
            upcomingBookings={(upcomingBookings || []) as any[]}
        />
    )
}
