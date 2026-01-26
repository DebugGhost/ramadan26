'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { BookingWithProfile } from '@/lib/types'
import ConfirmDialog from '@/components/ConfirmDialog'

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
    const [uncheckDialog, setUncheckDialog] = useState<{ isOpen: boolean; bookingId: string; studentName: string } | null>(null)

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
                    // Refetch bookings via API to ensure we have permission (Service Role)
                    // The client-side supabase client is restricted by RLS
                    try {
                        const res = await fetch(`/api/volunteer/bookings?date=${todayDate}`)
                        if (res.ok) {
                            const { bookings: newBookings } = await res.json()
                            if (newBookings) {
                                setBookings(newBookings)
                            }
                        }
                    } catch (err) {
                        console.error('Error refreshing bookings:', err)
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

    const handleCheckInClick = (bookingId: string, currentStatus: boolean, studentName: string) => {
        // If they're already checked in and we're unchecking them, show confirmation dialog
        if (currentStatus) {
            setUncheckDialog({ isOpen: true, bookingId, studentName })
            return
        }
        // Otherwise, just check them in directly
        performCheckIn(bookingId, false)
    }

    const performCheckIn = async (bookingId: string, currentStatus: boolean) => {
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

    const handleUncheckConfirm = () => {
        if (uncheckDialog) {
            performCheckIn(uncheckDialog.bookingId, true)
            setUncheckDialog(null)
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
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 flex items-center justify-center p-4">
                {/* Overlay pattern */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

                <div className="relative bg-slate-800/50 border border-purple-500/20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="bg-purple-500/10 p-4 rounded-2xl border border-purple-500/20">
                                <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                            Volunteer Kiosk
                        </h1>
                        <p className="text-gray-300">
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
                            className="w-full px-4 py-4 bg-slate-700/50 border border-purple-500/30 rounded-xl mb-4 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                            autoFocus
                        />

                        {error && (
                            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !pin}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? 'Verifying...' : 'Access Kiosk'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Home
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Check-In Interface
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
            {/* Overlay pattern */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <div className="relative">
                {/* Header */}
                <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Image
                                    src="/MSAUofAlogo.webp"
                                    alt="UAlberta MSA"
                                    width={56}
                                    height={56}
                                    className="h-12 w-auto"
                                />
                                <div>
                                    <h1 className="text-xl md:text-2xl font-bold text-white">
                                        Volunteer Check-In
                                    </h1>
                                    <p className="text-sm text-purple-300">
                                        {formatDate(todayDate)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                    {checkedInCount}/{totalCount}
                                </div>
                                <div className="text-sm text-gray-400">Checked In</div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container mx-auto px-4 py-8 max-w-5xl">
                    {/* Search Bar */}
                    <div className="mb-6 relative">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full pl-14 pr-6 py-4 bg-slate-800/50 border border-purple-500/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                        />
                    </div>

                    {/* Bookings List */}
                    <div className="bg-slate-800/50 border border-purple-500/20 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
                        {filteredBookings.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                {searchTerm ? 'No results found' : 'No confirmed bookings for today'}
                            </div>
                        ) : (
                            <div className="divide-y divide-purple-500/10">
                                {filteredBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className={`p-6 flex items-center justify-between hover:bg-slate-700/30 transition ${booking.checked_in ? 'bg-purple-500/10' : ''
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-white">
                                                {booking.profiles.full_name || 'Unknown'}
                                            </h3>
                                            <p className="text-sm text-gray-400">
                                                {booking.profiles.email}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleCheckInClick(booking.id, booking.checked_in, booking.profiles.full_name || 'this student')}
                                            className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-lg ${booking.checked_in
                                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-500/25'
                                                : 'bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white border border-purple-500/20'
                                                }`}
                                        >
                                            {booking.checked_in ? (
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Checked In
                                                </div>
                                            ) : 'Check In'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {/* Uncheck Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!uncheckDialog}
                title="Un-check Student?"
                message={`Are you sure you want to mark ${uncheckDialog?.studentName} as NOT checked in?`}
                confirmText="Yes, Un-check"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={handleUncheckConfirm}
                onCancel={() => setUncheckDialog(null)}
            />
        </div>
    )
}
