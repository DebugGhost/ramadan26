'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ReserveSpotResult } from '@/lib/types'

export async function reserveSpot(date: string, confirmedMuslim: boolean): Promise<{ success: boolean; message: string; result?: ReserveSpotResult }> {
    try {
        const supabase = await createClient()

        // Verify Muslim confirmation
        if (!confirmedMuslim) {
            return { success: false, message: '⚠️ You must confirm that you are Muslim to reserve a spot.' }
        }

        // Verify authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            console.error('No active session')
            return { success: false, message: 'You must be logged in to reserve a spot' }
        }

        // Call the reserve_spot RPC function
        const { data, error } = await supabase.rpc('reserve_spot', {
            day_date: date
        })

        if (error) {
            console.error('Reserve spot error:', error)
            console.error('Error details:', JSON.stringify(error, null, 2))
            return { success: false, message: `Error: ${error.message || 'An error occurred. Please try again.'}` }
        }

        const result = data as ReserveSpotResult

        // Generate user-friendly messages
        let message = ''
        let success = false

        switch (result) {
            case 'CONFIRMED':
                message = '✅ Spot reserved! You are confirmed for Iftar.'
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
                message = '😔 Both confirmed spots and waitlist are full for this day.'
                success = false
                break
            default:
                message = 'An unexpected error occurred.'
                success = false
        }

        revalidatePath('/dashboard')
        return { success, message, result }

    } catch (error) {
        console.error('Reserve spot exception:', error)
        return { success: false, message: 'An unexpected error occurred. Please try again.' }
    }
}

export async function cancelBooking(bookingId: string): Promise<{ success: boolean; message: string }> {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { success: false, message: 'You must be logged in to cancel a booking' }
        }

        // Update the booking status to 'cancelled'
        // RLS policy ensures users can only cancel their own bookings
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId)
            .eq('user_id', user.id) // Extra safety check

        if (error) {
            console.error('Cancel booking error:', error)
            return { success: false, message: 'Failed to cancel booking. Please try again.' }
        }

        revalidatePath('/dashboard')
        return { success: true, message: '✅ Reservation cancelled successfully.' }

    } catch (error) {
        console.error('Cancel booking exception:', error)
        return { success: false, message: 'An unexpected error occurred. Please try again.' }
    }
}
