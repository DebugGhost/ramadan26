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
