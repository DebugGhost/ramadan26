'use client'

import { useState, useEffect } from 'react'
import { reserveSpot, cancelBooking } from './actions'
import type { User } from '@supabase/supabase-js'
import type { Booking, Day, Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
    user: User
    profile: Profile | null
    todayDate: string
    todayDay: Day | null
    todayBooking: Booking | null
    capacityStats: {
        confirmed: number
        waitlist: number
        capacity_limit: number
    }
    upcomingBookings: any[]
}

export default function DashboardClient({
    user,
    profile,
    todayDate,
    todayDay,
    todayBooking: initialBooking,
    capacityStats: initialStats,
    upcomingBookings,
}: Props) {
    const [booking, setBooking] = useState(initialBooking)
    const [capacityStats, setCapacityStats] = useState(initialStats)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    // Real-time subscription for capacity updates
    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel('bookings-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookings',
                    filter: `day_id=eq.${todayDate}`,
                },
                async () => {
                    // Refetch capacity stats
                    const { data: bookings } = await supabase
                        .from('bookings')
                        .select('status')
                        .eq('day_id', todayDate)

                    if (bookings) {
                        const confirmed = bookings.filter(b => b.status === 'confirmed').length
                        const waitlist = bookings.filter(b => b.status === 'waitlist').length
                        setCapacityStats({ ...capacityStats, confirmed, waitlist })
                    }

                    // Refetch user's booking
                    const { data: userBooking } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('day_id', todayDate)
                        .in('status', ['confirmed', 'waitlist'])
                        .maybeSingle()

                    setBooking(userBooking as Booking | null)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [todayDate, user.id])

    const handleReserve = async () => {
        setLoading(true)
        setMessage('')
        const result = await reserveSpot(todayDate)
        setMessage(result.message)
        setLoading(false)
    }

    const handleCancel = async () => {
        if (!booking) return

        const confirmed = window.confirm('Are you sure you want to cancel your reservation?')
        if (!confirmed) return

        setLoading(true)
        setMessage('')
        const result = await cancelBooking(booking.id)
        setMessage(result.message)
        setLoading(false)
    }

    const handleSignOut = async () => {
        const form = document.createElement('form')
        form.method = 'post'
        form.action = '/auth/sign-out'
        document.body.appendChild(form)
        form.submit()
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString + 'T00:00:00')
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-emerald-800">
                        UAlberta MSA Iftar Portal
                    </h1>
                    <button
                        onClick={handleSignOut}
                        className="text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        As-salamu alaykum, {profile?.full_name || 'Student'}!
                    </h2>
                    <p className="text-gray-600">{user.email}</p>
                </div>

                {/* Today's Reservation Card */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Today's Iftar</h3>
                            <p className="text-gray-600">{formatDate(todayDate)}</p>
                        </div>
                        {todayDay && (
                            <div className="text-right">
                                <div className="text-sm text-gray-600">Capacity</div>
                                <div className="text-lg font-semibold text-emerald-600">
                                    {capacityStats.confirmed}/{capacityStats.capacity_limit}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Waitlist: {capacityStats.waitlist}/10
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Badge */}
                    {booking && (
                        <div className="mb-6">
                            {booking.status === 'confirmed' && (
                                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-semibold">
                                    <span className="text-xl">✅</span>
                                    <span>Confirmed</span>
                                </div>
                            )}
                            {booking.status === 'waitlist' && (
                                <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-semibold">
                                    <span className="text-xl">⏳</span>
                                    <span>Waitlisted</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Message Display */}
                    {message && (
                        <div className={`mb-6 p-4 rounded-lg ${message.includes('✅')
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : message.includes('⏳')
                                    ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                    : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                            {message}
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!todayDay ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>No Iftar scheduled for today</p>
                        </div>
                    ) : !todayDay.is_open ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Reservations are closed for today</p>
                        </div>
                    ) : booking ? (
                        <button
                            onClick={handleCancel}
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-4 px-8 rounded-lg transition-colors"
                        >
                            {loading ? 'Processing...' : 'Cancel Reservation'}
                        </button>
                    ) : (
                        <button
                            onClick={handleReserve}
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold py-4 px-8 rounded-lg transition-colors shadow-lg hover:shadow-xl"
                        >
                            {loading ? 'Processing...' : 'Reserve Spot for Today'}
                        </button>
                    )}
                </div>

                {/* Upcoming Reservations */}
                {upcomingBookings.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            Your Upcoming Reservations
                        </h3>
                        <div className="space-y-3">
                            {upcomingBookings.map((booking: any) => (
                                <div
                                    key={booking.id}
                                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                                >
                                    <div>
                                        <div className="font-semibold text-gray-900">
                                            {formatDate(booking.day_id)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {booking.status === 'confirmed' && (
                                            <span className="text-emerald-600 font-semibold">✅ Confirmed</span>
                                        )}
                                        {booking.status === 'waitlist' && (
                                            <span className="text-yellow-600 font-semibold">⏳ Waitlist</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
