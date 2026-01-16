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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
            {/* Overlay pattern */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <div className="relative">
                {/* Header */}
                <header className="border-b border-emerald-800/30 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                <span className="text-2xl">🌙</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">
                                    UAlberta MSA
                                </h1>
                                <p className="text-xs text-emerald-300">Iftar Portal</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-slate-800/50"
                        >
                            Sign Out
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container mx-auto px-4 py-8 max-w-4xl">
                    {/* Welcome Section */}
                    <div className="mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            As-salamu alaykum, {profile?.full_name || 'Student'}! 👋
                        </h2>
                        <p className="text-emerald-300">{user.email}</p>
                    </div>

                    {/* Today's Reservation Card */}
                    <div className="bg-slate-800/50 border border-emerald-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span>Today's Iftar</span>
                                    <span className="text-2xl">🍽️</span>
                                </h3>
                                <p className="text-gray-300">{formatDate(todayDate)}</p>
                            </div>
                            {todayDay && (
                                <div className="text-right">
                                    <div className="text-sm text-gray-400">Capacity</div>
                                    <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
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
                                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-5 py-3 rounded-xl font-semibold">
                                        <span className="text-xl">✅</span>
                                        <span>Confirmed</span>
                                    </div>
                                )}
                                {booking.status === 'waitlist' && (
                                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-5 py-3 rounded-xl font-semibold">
                                        <span className="text-xl">⏳</span>
                                        <span>Waitlisted</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Message Display */}
                        {message && (
                            <div className={`mb-6 p-4 rounded-xl border ${message.includes('✅')
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : message.includes('⏳')
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                    : 'bg-red-500/10 text-red-300 border-red-500/30'
                                }`}>
                                {message}
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!todayDay ? (
                            <div className="text-center py-8 text-gray-400">
                                <p>No Iftar scheduled for today</p>
                            </div>
                        ) : !todayDay.is_open ? (
                            <div className="text-center py-8 text-gray-400">
                                <p>Reservations are closed for today</p>
                            </div>
                        ) : booking ? (
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {loading ? 'Processing...' : 'Cancel Reservation'}
                            </button>
                        ) : (
                            <button
                                onClick={handleReserve}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-5 px-8 rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {loading ? 'Processing...' : 'Reserve Spot for Today'}
                            </button>
                        )}
                    </div>

                    {/* Upcoming Reservations */}
                    {upcomingBookings.length > 0 && (
                        <div className="bg-slate-800/50 border border-emerald-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-4">
                                Your Upcoming Reservations
                            </h3>
                            <div className="space-y-3">
                                {upcomingBookings.map((booking: any) => (
                                    <div
                                        key={booking.id}
                                        className="flex justify-between items-center p-4 bg-slate-700/30 border border-emerald-500/10 rounded-xl"
                                    >
                                        <div>
                                            <div className="font-semibold text-white">
                                                {formatDate(booking.day_id)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {booking.status === 'confirmed' && (
                                                <span className="text-emerald-300 font-semibold">✅ Confirmed</span>
                                            )}
                                            {booking.status === 'waitlist' && (
                                                <span className="text-amber-300 font-semibold">⏳ Waitlist</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
