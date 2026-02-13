'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { reserveNonMuslimSpot } from './actions'
import { cancelBooking } from '@/app/dashboard/actions'
import type { User } from '@supabase/supabase-js'
import type { Booking, Day, Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import ConfirmDialog from '@/components/ConfirmDialog'
import UserInfoModal from '@/components/UserInfoModal'

interface Props {
    user: User
    profile: Profile | null
    day: Day | null
    booking: Booking | null
    currentCount: number
    isSignupOpen: boolean
    spotLimit: number
}

export default function NonMuslimClient({
    user,
    profile,
    day,
    booking: initialBooking,
    currentCount: initialCount,
    isSignupOpen,
    spotLimit,
}: Props) {
    const router = useRouter()

    const [booking, setBooking] = useState(initialBooking)
    const [currentCount, setCurrentCount] = useState(initialCount)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [confirmedNonMuslim, setConfirmedNonMuslim] = useState(false)
    const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; bookingId: string } | null>(null)
    const [showUserInfoModal, setShowUserInfoModal] = useState(false)

    const isFull = currentCount >= spotLimit
    const targetDate = '2026-02-25'

    useEffect(() => {
        if (profile && (!profile.gender || !profile.referral_source)) {
            setShowUserInfoModal(true)
        }
    }, [profile])

    useEffect(() => {
        setBooking(initialBooking)
        setCurrentCount(initialCount)
    }, [initialBooking, initialCount])

    // Real-time subscription for booking changes on Feb 25th
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('non-muslim-bookings')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookings',
                    filter: `day_id=eq.${targetDate}`,
                },
                async () => {
                    // Refetch count
                    const { data: bookings } = await supabase
                        .from('bookings')
                        .select('id')
                        .eq('day_id', targetDate)
                        .in('status', ['confirmed', 'waitlist'])

                    if (bookings) {
                        setCurrentCount(bookings.length)
                    }

                    // Refetch user's booking
                    const { data: userBooking } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('day_id', targetDate)
                        .in('status', ['confirmed', 'waitlist'])
                        .maybeSingle()

                    setBooking(userBooking as Booking | null)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user.id])

    const handleReserve = async () => {
        if (profile && (!profile.gender || !profile.referral_source)) {
            setShowUserInfoModal(true)
            return
        }

        if (!confirmedNonMuslim) {
            setMessage('⚠️ Please confirm that you are not a Muslim to reserve a spot.')
            return
        }

        setLoading(true)
        setMessage('')
        const result = await reserveNonMuslimSpot()
        setMessage(result.message)
        setLoading(false)

        if (result.success) {
            setConfirmedNonMuslim(false)
            router.refresh()
        }
    }

    const handleCancelClick = (bookingId: string) => {
        setCancelDialog({ isOpen: true, bookingId })
    }

    const handleCancelConfirm = async () => {
        if (!cancelDialog) return
        const { bookingId } = cancelDialog
        setCancelDialog(null)
        setLoading(true)
        setMessage('')

        const result = await cancelBooking(bookingId)
        setMessage(result.message)
        setLoading(false)

        if (result.success) {
            router.refresh()
        }
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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <div className="relative">
                {/* Header */}
                <header className="border-b border-blue-800/30 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Image
                                src="/MSAUofAlogo.webp"
                                alt="UAlberta MSA"
                                width={48}
                                height={48}
                                className="h-10 w-auto"
                            />
                            <div>
                                <h1 className="text-lg font-bold text-white">MSA UofA</h1>
                                <p className="text-xs text-purple-300">Iftar Portal — Non-Muslim Sign-up</p>
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

                <main className="container mx-auto px-4 py-8 max-w-4xl">
                    <div className="mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Welcome, {profile?.full_name || 'Student'}!
                        </h2>
                        <p className="text-purple-300">{user.email}</p>
                    </div>

                    {/* Main Card */}
                    <div className="bg-slate-800/50 border border-purple-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg className="w-32 h-32 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        </div>

                        <div className="relative z-10">
                            <div className="mb-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-4">
                                    <span className="text-emerald-300 font-semibold text-sm">Non-Muslim Iftar</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span>February 25th Iftar</span>
                                </h3>
                                <p className="text-purple-200 font-medium text-lg">{formatDate(targetDate)}</p>
                                {day?.menu_item && (
                                    <div className="mt-3 flex items-center gap-2 text-gray-300">
                                        <svg className="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        <span className="text-base"><span className="text-purple-300 font-medium">Menu:</span> {day.menu_item}</span>
                                    </div>
                                )}
                            </div>

                            {/* Info banner */}
                            <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                <p className="text-blue-300 text-sm">
                                    ℹ️ Spots for Muslim students will open at the usual time — <span className="font-bold text-white">12:00 PM on February 24th</span> — on the{' '}
                                    <Link href="/dashboard" className="underline hover:text-blue-200">main page</Link>.
                                </p>
                            </div>

                            {/* Status Badge */}
                            {booking && (
                                <div className="mb-6">
                                    {booking.status === 'confirmed' && (
                                        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 px-5 py-3 rounded-xl font-semibold">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>Confirmed</span>
                                        </div>
                                    )}
                                    {booking.status === 'waitlist' && (
                                        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-5 py-3 rounded-xl font-semibold">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="flex flex-col text-left">
                                                <span>Waitlisted</span>
                                                <span className="text-xs font-normal opacity-80">We will notify you via your email</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Messages */}
                            {message && (
                                <div className={`mb-6 p-4 rounded-xl border ${message.includes('✅')
                                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                    : message.includes('⏳')
                                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                        : 'bg-red-500/10 text-red-300 border-red-500/30'
                                    }`}>
                                    {message}
                                </div>
                            )}

                            {/* Main Action Area */}
                            {!isSignupOpen ? (
                                /* Signup window closed */
                                <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-purple-500/10">
                                    <div className="inline-block p-4 bg-purple-500/10 rounded-full mb-4">
                                        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">Sign-ups Closed for Non-Muslims</h4>
                                    <p className="text-gray-400 mb-4">
                                        The non-Muslim sign-up window has ended.
                                    </p>
                                    <p className="text-gray-400 mb-6">
                                        Muslim students can sign up on the main page.
                                    </p>
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
                                    >
                                        Go to Main Page
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                            ) : !day ? (
                                <div className="text-center py-8 text-gray-400 bg-slate-900/30 rounded-2xl border border-gray-700/50">
                                    <p>No Iftar data found for February 25th. Please check back later.</p>
                                </div>
                            ) : isFull && !booking ? (
                                /* 80 spots full */
                                <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-amber-500/10">
                                    <div className="inline-block p-4 bg-amber-500/10 rounded-full mb-4">
                                        <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">All {spotLimit} Non-Muslim Spots Taken!</h4>
                                    <p className="text-gray-400 mb-2">
                                        The remaining spots will open for everyone on the{' '}
                                        <Link href="/dashboard" className="text-purple-400 underline hover:text-purple-300">main page</Link>{' '}
                                        at <span className="font-bold text-white">12:00 PM on February 24th</span>.
                                    </p>
                                </div>
                            ) : booking ? (
                                /* Already booked — show cancel */
                                <button
                                    onClick={() => handleCancelClick(booking.id)}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {loading ? 'Processing...' : 'Cancel Reservation'}
                                </button>
                            ) : (
                                /* Signup form */
                                <>
                                    <div className="mb-6 bg-slate-700/30 border border-purple-500/20 rounded-xl p-5">
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={confirmedNonMuslim}
                                                onChange={(e) => setConfirmedNonMuslim(e.target.checked)}
                                                className="mt-1 w-5 h-5 rounded border-2 border-purple-500/30 bg-slate-800/50 checked:bg-purple-500 checked:border-purple-500 focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all"
                                            />
                                            <span className="flex-1 text-gray-300 group-hover:text-white transition-colors">
                                                I confirm that I am not a Muslim. I understand this Iftar is open to all and I would like to join.
                                            </span>
                                        </label>
                                    </div>

                                    <button
                                        onClick={handleReserve}
                                        disabled={loading || !confirmedNonMuslim}
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-5 px-8 rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {loading ? 'Processing...' : 'Reserve Spot for February 25th Iftar'}
                                    </button>

                                    <p className="text-center text-gray-500 text-sm mt-4">
                                        {spotLimit - currentCount} of {spotLimit} non-Muslim spots remaining
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Cancel Dialog */}
            <ConfirmDialog
                isOpen={!!cancelDialog}
                title="Cancel Reservation?"
                message="Are you sure you want to cancel your Iftar reservation? Someone else may take your spot."
                confirmText="Yes, Cancel"
                cancelText="Keep Reservation"
                confirmVariant="danger"
                onConfirm={handleCancelConfirm}
                onCancel={() => setCancelDialog(null)}
            />

            {/* User Info Modal */}
            <UserInfoModal
                isOpen={showUserInfoModal}
                onSuccess={() => {
                    setShowUserInfoModal(false)
                    router.refresh()
                }}
            />
        </div>
    )
}
