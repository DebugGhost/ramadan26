export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    role: 'student' | 'volunteer' | 'admin'
                    created_at: string
                    updated_at: string
                    gender: 'brother' | 'sister' | null
                    referral_source: string | null
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    role?: 'student' | 'volunteer' | 'admin'
                    created_at?: string
                    updated_at?: string
                    gender?: 'brother' | 'sister' | null
                    referral_source?: string | null
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    role?: 'student' | 'volunteer' | 'admin'
                    created_at?: string
                    updated_at?: string
                    gender?: 'brother' | 'sister' | null
                    referral_source?: string | null
                }
            }
            days: {
                Row: {
                    date: string
                    is_open: boolean
                    capacity_limit: number
                    created_at: string
                    updated_at: string
                    volunteer_pin: string | null
                }
                Insert: {
                    date: string
                    is_open?: boolean
                    capacity_limit?: number
                    created_at?: string
                    updated_at?: string
                    volunteer_pin?: string | null
                }
                Update: {
                    date?: string
                    is_open?: boolean
                    capacity_limit?: number
                    created_at?: string
                    updated_at?: string
                    volunteer_pin?: string | null
                }
            }
            bookings: {
                Row: {
                    id: string
                    user_id: string
                    day_id: string
                    status: 'confirmed' | 'waitlist' | 'cancelled'
                    created_at: string
                    updated_at: string
                    checked_in: boolean
                    checked_in_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    day_id: string
                    status: 'confirmed' | 'waitlist' | 'cancelled'
                    created_at?: string
                    updated_at?: string
                    checked_in?: boolean
                    checked_in_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    day_id?: string
                    status?: 'confirmed' | 'waitlist' | 'cancelled'
                    created_at?: string
                    updated_at?: string
                    checked_in?: boolean
                    checked_in_at?: string | null
                }
            }
        }
        Functions: {
            reserve_spot: {
                Args: {
                    day_date: string
                }
                Returns: string
            }
        }
    }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Day = Database['public']['Tables']['days']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']

export type BookingStatus = 'confirmed' | 'waitlist' | 'cancelled'
export type ReserveSpotResult = 'CONFIRMED' | 'WAITLISTED' | 'ALREADY_BOOKED' | 'DAY_CLOSED' | 'FULL'

export interface BookingWithProfile extends Booking {
    profiles: Profile
}
