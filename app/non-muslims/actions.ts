'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ReserveSpotResult } from '@/lib/types'
import { getCurrentHourInEdmonton, getTodayInEdmonton } from '@/lib/date-utils'

const NON_MUSLIM_DATE = '2026-02-25'
const NON_MUSLIM_SPOT_LIMIT = 80
// Signups close at 12 PM on Feb 24th (when regular signups open for the 25th)
const SIGNUP_CLOSES_DATE = '2026-02-24'
const SIGNUP_CLOSES_HOUR = 12

export async function reserveNonMuslimSpot(): Promise<{ success: boolean; message: string; result?: ReserveSpotResult }> {
    try {
        const supabase = await createClient()

        // Verify authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return { success: false, message: 'You must be logged in to reserve a spot.' }
        }

        // Check if the non-muslim signup window is still open
        const today = getTodayInEdmonton()
        const currentHour = getCurrentHourInEdmonton()

        // If it's Feb 24th at noon or later (or any date after), signups are closed
        if (today > SIGNUP_CLOSES_DATE || (today === SIGNUP_CLOSES_DATE && currentHour >= SIGNUP_CLOSES_HOUR)) {
            return { success: false, message: '🔒 Non-Muslim sign-ups are now closed. Please check the main page at 12:00 PM on February 24th.' }
        }

        // Check the 80-spot cap
        const { data: bookings, error: countError } = await supabase
            .from('bookings')
            .select('id')
            .eq('day_id', NON_MUSLIM_DATE)
            .in('status', ['confirmed', 'waitlist'])

        if (countError) {
            console.error('Count error:', countError)
            return { success: false, message: 'An error occurred. Please try again.' }
        }

        const currentCount = bookings?.length || 0
        if (currentCount >= NON_MUSLIM_SPOT_LIMIT) {
            return {
                success: false,
                message: '😔 All 80 non-Muslim spots are taken! The remaining spots will open on the main page at 12:00 PM on February 24th.'
            }
        }

        // Call the existing reserve_spot RPC
        const { data, error } = await supabase.rpc('reserve_spot', {
            day_date: NON_MUSLIM_DATE
        })

        if (error) {
            console.error('Reserve spot error:', error)
            return { success: false, message: `Error: ${error.message || 'An error occurred. Please try again.'}` }
        }

        const result = data as ReserveSpotResult

        let message = ''
        let success = false

        switch (result) {
            case 'CONFIRMED':
                message = '✅ Spot reserved! You are confirmed for the February 25th Iftar.'
                success = true
                break
            case 'WAITLISTED':
                message = '⏳ You have been added to the waitlist. We will notify you if a spot opens up.'
                success = true
                break
            case 'ALREADY_BOOKED':
                message = '⚠️ You already have a reservation for this day.'
                success = false
                break
            case 'DAY_CLOSED':
                message = '🔒 Reservations are closed for this day.'
                success = false
                break
            case 'FULL':
                message = '😔 All spots are full for this day.'
                success = false
                break
            default:
                message = 'An unexpected error occurred.'
                success = false
        }

        revalidatePath('/non-muslims')
        revalidatePath('/dashboard')
        return { success, message, result }

    } catch (error) {
        console.error('Reserve non-muslim spot exception:', error)
        return { success: false, message: 'An unexpected error occurred. Please try again.' }
    }
}
