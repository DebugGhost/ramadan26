'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ReserveSpotResult } from '@/lib/types'
import { verifyTurnstileToken } from '@/lib/turnstile'

export async function reserveSpot(date: string, confirmedMuslim: boolean, turnstileToken: string): Promise<{ success: boolean; message: string; result?: ReserveSpotResult }> {
    try {
        const supabase = await createClient()

        // Verify Turnstile token (bot protection)
        const isHuman = await verifyTurnstileToken(turnstileToken)
        if (!isHuman) {
            return { success: false, message: '⚠️ Bot verification failed. Please refresh the page and try again.' }
        }

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

        // Check if this is a same-day booking being cancelled after 5 PM Edmonton time
        const { data: booking } = await supabase
            .from('bookings')
            .select('day_id')
            .eq('id', bookingId)
            .eq('user_id', user.id)
            .single()

        if (booking) {
            const now = new Date()
            const edmontonNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Edmonton' }))
            const todayStr = edmontonNow.toISOString().split('T')[0]

            if (booking.day_id === todayStr && edmontonNow.getHours() >= 17) {
                return { success: false, message: '⚠️ Cancellations for today\'s iftar are closed after 5:00 PM.' }
            }
        }

        // Delete the booking row so the user can re-book if they want
        // RLS policy ensures users can only cancel their own bookings
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', bookingId)
            .eq('user_id', user.id) // Extra safety check

        if (error) {
            console.error('Cancel booking error:', error)
            return { success: false, message: 'Failed to cancel booking. Please try again.' }
        }

        revalidatePath('/dashboard')
        return { success: true, message: '✅ Reservation cancelled successfully. You can now book again.' }

    } catch (error) {
        console.error('Cancel booking exception:', error)
        return { success: false, message: 'An unexpected error occurred. Please try again.' }
    }
}

export async function updateProfile(gender: 'brother' | 'sister', referralSource: string): Promise<{ success: boolean; message: string }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return { success: false, message: 'You must be logged in to update your profile' }
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                gender,
                referral_source: referralSource
            })
            .eq('id', user.id)

        if (error) {
            console.error('Update profile error:', error)
            return { success: false, message: 'Failed to update profile. Please try again.' }
        }

        revalidatePath('/dashboard')
        return { success: true, message: 'Profile updated successfully' }
    } catch (error) {
        console.error('Update profile exception:', error)
        return { success: false, message: 'An unexpected error occurred' }
    }
}

