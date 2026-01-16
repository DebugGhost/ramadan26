'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BookingWithProfile } from '@/lib/types'

interface VolunteerPageProps {
    initialBookings: BookingWithProfile[]
    todayDate: string
}

export default function VolunteerClient({ initialBookings, todayDate }: VolunteerPageProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [bookings, setBookings] = useState<BookingWithProfile[]>(initialBookings)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        // Check if already authenticated via cookie
        const checkAuth = async () => {
            const response = await fetch('/api/volunteer/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: 'check' }),
            })
            if (response.status === 200) {
                setIsAuthenticated(true)
            }
        }

        // For simplicity, we'll require PIN entry each time
        // checkAuth()
    }, [])

    // Real-time subscription
    useEffect(() => {
        if (!isAuthenticated) return

        const supabase = createClient()

        const channel = supabase
            .channel('volunteer-bookings')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookings',
                    filter: `day_id=eq.${todayDate}`,
                },
                async () => {
                    // Refetch bookings
                    const { data } = await supabase
                        .from('bookings')
                        .select('*, profiles(*)')
                        .eq('day_id', todayDate)
                        .eq('status', 'confirmed')
                        .order('profiles(full_name)', { ascending: true })

                    if (data) {
                        setBookings(data as any)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [isAuthenticated, todayDate])

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/volunteer/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin }),
            })

            if (response.ok) {
                setIsAuthenticated(true)
            } else {
                setError('Incorrect PIN. Please try again.')
            }
        } catch (err) {
            setError('An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleCheckIn = async (bookingId: string, currentStatus: boolean) => {
        try {
            const response = await fetch('/api/volunteer/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    checkedIn: !currentStatus,
                }),
            })

            if (response.ok) {
                // Optimistically update UI
                setBookings(prev =>
                    prev.map(b =>
                        b.id === bookingId
                            ? { ...b, checked_in: !currentStatus }
                            : b
                    )
                )
            } else {
                alert('Failed to update check-in status')
            }
        } catch (err) {
            alert('An error occurred')
        }
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

    const filteredBookings = bookings.filter(booking => {
        const searchLower = searchTerm.toLowerCase()
        return (
            booking.profiles.full_name?.toLowerCase().includes(searchLower) ||
            booking.profiles.email.toLowerCase().includes(searchLower)
        )
    })

    const checkedInCount = bookings.filter(b => b.checked_in).length
    const totalCount = bookings.length

    // PIN Entry Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="text-4xl mb-4">🔐</div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Volunteer Kiosk
                        </h1>
                        <p className="text-gray-600">
                            Enter PIN to access check-in portal
                        </p>
                    </div>

                    <form onSubmit={handlePinSubmit}>
                        <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Enter PIN"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !pin}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                            {loading ? 'Verifying...' : 'Access Kiosk'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <a href="/" className="text-sm text-gray-500 hover:text-gray-700 underline">
                            ← Back to Home
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Check-In Interface
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-blue-800">
                                Volunteer Check-In Kiosk
                            </h1>
                            <p className="text-sm text-gray-600">
                                {formatDate(todayDate)}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">
                                {checkedInCount}/{totalCount}
                            </div>
                            <div className="text-sm text-gray-600">Checked In</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Search Bar */}
                <div className="mb-6">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Bookings List */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {filteredBookings.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            {searchTerm ? 'No results found' : 'No confirmed bookings for today'}
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className={`p-6 flex items-center justify-between hover:bg-gray-50 transition ${booking.checked_in ? 'bg-green-50' : ''
                                        }`}
                                >
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {booking.profiles.full_name || 'Unknown'}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {booking.profiles.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleCheckIn(booking.id, booking.checked_in)}
                                        className={`px-6 py-3 rounded-lg font-semibold transition-all ${booking.checked_in
                                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                            }`}
                                    >
                                        {booking.checked_in ? '✓ Checked In' : 'Check In'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
