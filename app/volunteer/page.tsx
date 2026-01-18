import { createClient } from '@supabase/supabase-js'
import VolunteerClient from './volunteer-client'
import type { Database, BookingWithProfile } from '@/lib/types'
import { getTodayInEdmonton } from '@/lib/date-utils'

// Force dynamic rendering - this page needs runtime access to env vars
export const dynamic = 'force-dynamic'

export default async function VolunteerPage() {
    // Get today's date in Edmonton timezone
    const today = getTodayInEdmonton()

    // Create Supabase client with service role (to bypass RLS for read-only access)
    const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )

    // Fetch today's confirmed bookings with profile data
    const { data: bookings } = await supabase
        .from('bookings')
        .select('*, profiles(*)')
        .eq('day_id', today)
        .eq('status', 'confirmed')
        .order('checked_in', { ascending: true })

    return (
        <VolunteerClient
            initialBookings={(bookings || []) as any}
            todayDate={today}
        />
    )
}
