import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NonMuslimClient from './non-muslim-client'
import type { Booking } from '@/lib/types'
import { getTodayInEdmonton, getCurrentHourInEdmonton } from '@/lib/date-utils'

const NON_MUSLIM_DATE = '2026-02-25'
const NON_MUSLIM_SPOT_LIMIT = 80
const SIGNUP_CLOSES_DATE = '2026-02-24'
const SIGNUP_CLOSES_HOUR = 12

export default async function NonMuslimsPage() {
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

    // Check if the signup window is still open
    const today = getTodayInEdmonton()
    const currentHour = getCurrentHourInEdmonton()
    const isSignupOpen = today < SIGNUP_CLOSES_DATE || (today === SIGNUP_CLOSES_DATE && currentHour < SIGNUP_CLOSES_HOUR)

    // Get the Feb 25th day data
    const { data: day } = await supabase
        .from('days')
        .select('*')
        .eq('date', NON_MUSLIM_DATE)
        .single()

    // Get user's existing booking for Feb 25th
    const { data: userBooking } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .eq('day_id', NON_MUSLIM_DATE)
        .in('status', ['confirmed', 'waitlist'])
        .maybeSingle()

    // Count current bookings for Feb 25th
    const { data: allBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('day_id', NON_MUSLIM_DATE)
        .in('status', ['confirmed', 'waitlist'])

    const currentCount = allBookings?.length || 0

    return (
        <NonMuslimClient
            user={user}
            profile={profile}
            day={day}
            booking={userBooking as Booking | null}
            currentCount={currentCount}
            isSignupOpen={isSignupOpen}
            spotLimit={NON_MUSLIM_SPOT_LIMIT}
        />
    )
}
