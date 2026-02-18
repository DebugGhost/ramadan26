'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateDailyCapacity(date: string, newCapacity: number) {
    const supabase = await createClient()

    // Verify Is Admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error('Unauthorized')

    // Update
    const { error } = await supabase
        .from('days')
        .update({ capacity_limit: newCapacity })
        .eq('date', date)

    if (error) {
        console.error('Error updating capacity:', error)
        throw new Error('Failed to update capacity')
    }

    revalidatePath('/admin')
}

export async function getWaitlistedUsers(date: string) {
    const supabase = await createClient()

    // Verify Is Admin -> simplified check since middleware or page should handle it, but good to double check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Optional: Strict role check if needed, though usually handled by RLS if set up correctly or previous check
    // For safety, let's keep it consistent
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error('Unauthorized')

    const { data, error } = await supabase
        .from('bookings')
        .select(`
            created_at,
            profiles (
                full_name,
                email
            )
        `)
        .eq('day_id', date)
        .eq('status', 'waitlist')
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching waitlist:', error)
        throw new Error('Failed to fetch waitlist')
    }

    // Flatten data for easier consumption
    return (data as any[]).map(booking => {
        const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles
        return {
            full_name: profile?.full_name || 'Unknown',
            email: profile?.email || 'No Email',
            joined_at: booking.created_at
        }
    })
}
