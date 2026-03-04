'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { reserveSpot, cancelBooking } from './actions'
import type { User } from '@supabase/supabase-js'
import type { Booking, Day, Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import ConfirmDialog from '@/components/ConfirmDialog'
import UserInfoModal from '@/components/UserInfoModal'

interface Props {
    user: User
    profile: Profile | null
    todayDate: string
    tomorrowDate: string
    todayDay: Day | null
    tomorrowDay: Day | null
    todayBooking: Booking | null
    tomorrowBooking: Booking | null
    tomorrowStats: {
        confirmed: number
        waitlist: number
        capacity_limit: number
    }
    isRegistrationOpen: boolean
    upcomingBookings: any[]
}

export default function DashboardClient({
    user,
    profile,
    todayDate,
    tomorrowDate,
    todayDay,
    tomorrowDay,
    todayBooking: initialTodayBooking,
    tomorrowBooking: initialTomorrowBooking,
    tomorrowStats: initialStats,
    isRegistrationOpen,
    upcomingBookings,
}: Props) {
    const router = useRouter()

    const [tomorrowBooking, setTomorrowBooking] = useState(initialTomorrowBooking)
    const [todayBooking, setTodayBooking] = useState(initialTodayBooking)

    const [capacityStats, setCapacityStats] = useState(initialStats)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [confirmedMuslim, setConfirmedMuslim] = useState(false)

    const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; bookingId: string; date: string } | null>(null)
    const [showUserInfoModal, setShowUserInfoModal] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
    const turnstileWidgetRef = useRef<HTMLDivElement>(null)
    const turnstileWidgetId = useRef<string | null>(null)

    // Check if it's past 5 PM Edmonton time — hide cancel button for today's iftar after this
    const isPastCancelCutoff = useCallback(() => {
        const now = new Date()
        const edmontonHour = parseInt(
            new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Edmonton' }).format(now)
        )
        return edmontonHour >= 17
    }, [])

    const [todayCancelDisabled, setTodayCancelDisabled] = useState(isPastCancelCutoff())

    useEffect(() => {
        // Re-check every minute so the button disappears at 5 PM without refresh
        const interval = setInterval(() => {
            setTodayCancelDisabled(isPastCancelCutoff())
        }, 60_000)
        return () => clearInterval(interval)
    }, [isPastCancelCutoff])

    useEffect(() => {
        if (profile && (!profile.gender || !profile.referral_source)) {
            setShowUserInfoModal(true)
        }
    }, [profile])

    // Load Turnstile script and render widget
    const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

    const renderTurnstile = useCallback(() => {
        if (!turnstileSiteKey || !turnstileWidgetRef.current) return
        const win = window as any
        if (!win.turnstile) return

        // Remove existing widget if any
        if (turnstileWidgetId.current) {
            try { win.turnstile.remove(turnstileWidgetId.current) } catch { }
            turnstileWidgetId.current = null
        }

        turnstileWidgetId.current = win.turnstile.render(turnstileWidgetRef.current, {
            sitekey: turnstileSiteKey,
            callback: (token: string) => setTurnstileToken(token),
            'expired-callback': () => setTurnstileToken(null),
            'error-callback': () => setTurnstileToken(null),
            theme: 'dark',
        })
    }, [turnstileSiteKey])

    useEffect(() => {
        if (!turnstileSiteKey) return

        // Check if script already loaded
        if ((window as any).turnstile) {
            renderTurnstile()
            return
        }

        const script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.onload = () => renderTurnstile()
        document.head.appendChild(script)

        return () => {
            // Cleanup widget on unmount
            const win = window as any
            if (turnstileWidgetId.current && win.turnstile) {
                try { win.turnstile.remove(turnstileWidgetId.current) } catch { }
            }
        }
    }, [turnstileSiteKey, renderTurnstile])


    // Sync state with props
    useEffect(() => {
        setTomorrowBooking(initialTomorrowBooking)
        setTodayBooking(initialTodayBooking)
        setCapacityStats(initialStats)
    }, [initialTomorrowBooking, initialTodayBooking, initialStats])

    // Real-time subscription for Tomorrow's capacity (Main Focus)
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
                    filter: `day_id=eq.${tomorrowDate}`,
                },
                async () => {
                    // Refetch Tomorrow's capacity stats
                    const { data: bookings } = await supabase
                        .from('bookings')
                        .select('status')
                        .eq('day_id', tomorrowDate)

                    if (bookings) {
                        const confirmed = bookings.filter(b => b.status === 'confirmed').length
                        const waitlist = bookings.filter(b => b.status === 'waitlist').length
                        setCapacityStats(prev => ({ ...prev, confirmed, waitlist }))
                    }

                    // Refetch User's Tomorrow Booking
                    const { data: userBooking } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('day_id', tomorrowDate)
                        .in('status', ['confirmed', 'waitlist'])
                        .maybeSingle()

                    setTomorrowBooking(userBooking as Booking | null)

                    // Also refetch Today's booking just in case
                    const { data: userTodayBooking } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('day_id', todayDate)
                        .in('status', ['confirmed', 'waitlist'])
                        .maybeSingle()

                    setTodayBooking(userTodayBooking as Booking | null)

                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tomorrowDate, todayDate, user.id, router])

    const resetTurnstile = () => {
        setTurnstileToken(null)
        const win = window as any
        if (turnstileWidgetId.current && win.turnstile) {
            try { win.turnstile.reset(turnstileWidgetId.current) } catch { }
        }
    }

    const handleReserve = async () => {
        // Double check profile info
        if (profile && (!profile.gender || !profile.referral_source)) {
            setShowUserInfoModal(true)
            return
        }

        if (!tomorrowDay) return

        if (!confirmedMuslim) {
            setMessage('⚠️ Please confirm that you are Muslim to reserve a spot.')
            return
        }

        // Check Turnstile token (only if site key is configured)
        if (turnstileSiteKey && !turnstileToken) {
            setMessage('⚠️ Please complete the verification challenge.')
            return
        }

        setLoading(true)
        setMessage('')
        // Reserve for TOMORROW
        const result = await reserveSpot(tomorrowDate, confirmedMuslim, turnstileToken || '')
        setMessage(result.message)
        setLoading(false)

        // Reset Turnstile widget for next attempt
        resetTurnstile()

        if (result.success) {
            setConfirmedMuslim(false)
            router.refresh()
        }
    }

    const handleCancelClick = (bookingId: string, date: string) => {
        setCancelDialog({ isOpen: true, bookingId, date })
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
            {/* Overlay pattern */}
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
                                <p className="text-xs text-purple-300">Iftar Portal</p>
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
                            As-salamu alaykum, {profile?.full_name || 'Student'}!
                        </h2>
                        <p className="text-purple-300">{user.email}</p>
                    </div>

                    {/* DONATION GOAL CARD */}
                    <div className="donation-goal-glow bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl mb-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />
                        <div className="relative z-10">
                            <div className="text-center mb-5">
                                <p className="text-sm uppercase tracking-widest text-amber-400/80 font-semibold mb-2">🤲 We still need</p>
                                <h3 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent mb-2">$12,000</h3>
                                <p className="text-gray-300 text-base md:text-lg">to cover the cost of iftars this Ramadan. Your donation directly feeds fasting students.</p>
                                <p className="text-amber-300/70 text-sm mt-2 font-medium">Every dollar counts — any amount helps 💛</p>
                            </div>
                            <div className="border-t border-purple-500/20 pt-4 mb-5">
                                <p className="text-lg font-arabic text-purple-200 mb-2 font-semibold leading-loose text-center">مَنْ فَطَّرَ صَائِمًا كَانَ لَهُ مِثْلُ أَجْرِهِ غَيْرَ أَنَّهُ لاَ يَنْقُصُ مِنْ أَجْرِ الصَّائِمِ شَيْئًا</p>
                                <p className="text-gray-400 italic text-sm text-center mb-1">&quot;Whoever gives food for a fasting person to break his fast, he will have a reward like theirs, without that detracting from their reward in the slightest.&quot;</p>
                                <p className="text-xs text-purple-400 font-medium tracking-wide uppercase text-center">— Sunan Ibn Majah</p>
                            </div>
                            <div className="text-center">
                                <button onClick={() => router.push('/donate')} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-900 font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.03] active:scale-[0.98]">Donate Now</button>
                            </div>
                        </div>
                    </div>
                    {/* MAIN CARD: TOMORROW'S IFTAR */}
                    <div className="bg-slate-800/50 border border-purple-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg className="w-32 h-32 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <span>Tomorrow's Iftar</span>
                                    </h3>
                                    <p className="text-purple-200 font-medium text-lg">{formatDate(tomorrowDate)}</p>
                                    {tomorrowDay?.menu_item && (
                                        <div className="mt-3 flex items-center gap-2 text-gray-300">
                                            <svg className="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            <span className="text-base"><span className="text-purple-300 font-medium">Menu:</span> {tomorrowDay.menu_item}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status Badge For Tomorrow */}
                            {tomorrowBooking && (
                                <div className="mb-6">
                                    {tomorrowBooking.status === 'confirmed' && (
                                        <div>
                                            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 px-5 py-3 rounded-xl font-semibold">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Confirmed</span>
                                            </div>
                                            <p className="mt-3 text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
                                                ⚠️ If you can&apos;t make it, please cancel your reservation so someone on the waitlist can get an iftar.
                                            </p>
                                        </div>
                                    )}
                                    {tomorrowBooking.status === 'waitlist' && (
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
                            {!tomorrowDay ? (
                                <div className="text-center py-8 text-gray-400 bg-slate-900/30 rounded-2xl border border-gray-700/50">
                                    <p>No Iftar scheduled for tomorrow</p>
                                </div>
                            ) : !isRegistrationOpen ? (
                                <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-purple-500/10">
                                    <div className="inline-block p-4 bg-purple-500/10 rounded-full mb-4">
                                        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">Registration Opens at 12:00 PM</h4>
                                    <p className="text-gray-400">Check back at noon today to reserve your spot.</p>
                                </div>
                            ) : !tomorrowDay.is_open ? (
                                <div className="text-center py-8 text-gray-400 bg-slate-900/30 rounded-2xl">
                                    <p>Reservations are closed for tomorrow</p>
                                </div>
                            ) : tomorrowBooking ? (
                                <button
                                    onClick={() => handleCancelClick(tomorrowBooking.id, tomorrowDate)}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {loading ? 'Processing...' : 'Cancel Reservation'}
                                </button>
                            ) : (
                                <>
                                    <div className="mb-6 bg-slate-700/30 border border-purple-500/20 rounded-xl p-5">
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={confirmedMuslim}
                                                onChange={(e) => setConfirmedMuslim(e.target.checked)}
                                                className="mt-1 w-5 h-5 rounded border-2 border-purple-500/30 bg-slate-800/50 checked:bg-purple-500 checked:border-purple-500 focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all"
                                            />
                                            <span className="flex-1 text-gray-300 group-hover:text-white transition-colors">
                                                I confirm that I am Muslim. These iftars are intended for Muslims only.
                                            </span>
                                        </label>
                                    </div>

                                    {/* Turnstile Widget */}
                                    {turnstileSiteKey && (
                                        <div className="mb-4 flex justify-center">
                                            <div ref={turnstileWidgetRef}></div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleReserve}
                                        disabled={loading || !confirmedMuslim}
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-5 px-8 rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {loading ? 'Processing...' : 'Reserve Spot for Tomorrow'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div >

                    {/* SECONDARY CARD: TODAY'S IFTAR */}
                    {
                        todayDay && (
                            <div className="bg-slate-800/30 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm mb-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-gray-400 text-sm uppercase tracking-wider font-semibold mb-1">
                                            Today's Iftar ({formatDate(todayDate)})
                                        </h4>

                                        {!todayBooking ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>No active reservation</span>
                                                </div>
                                                {/* DEMO BUTTON REMOVED */}
                                            </div>
                                        ) : todayBooking.status === 'confirmed' ? (
                                            <div className="flex items-center gap-2 text-purple-300">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="font-semibold">Confirmed</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-amber-300">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">Waitlisted</span>
                                                    <span className="text-xs font-normal opacity-80">We will notify you via your email</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Allow cancelling today's iftar too — but not after 5 PM */}
                                    {todayBooking && !todayCancelDisabled && (
                                        <button
                                            onClick={() => handleCancelClick(todayBooking.id, todayDate)}
                                            className="text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    }

                    {/* UPCOMING BOOKINGS LIST */}
                    {
                        upcomingBookings.length > 0 && (
                            <div className="bg-slate-800/50 border border-purple-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                                <h3 className="text-xl font-bold text-white mb-4">
                                    Other Upcoming Reservations
                                </h3>
                                <div className="space-y-3">
                                    {upcomingBookings.map((booking: any) => (
                                        <div
                                            key={booking.id}
                                            className="flex justify-between items-center p-4 bg-slate-700/30 border border-purple-500/10 rounded-xl"
                                        >
                                            <div>
                                                <div className="font-semibold text-white">
                                                    {formatDate(booking.day_id)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {booking.status === 'confirmed' && (
                                                    <div className="flex items-center gap-1 text-purple-300 font-semibold">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span>Confirmed</span>
                                                    </div>
                                                )}
                                                {booking.status === 'waitlist' && (
                                                    <div className="flex items-center gap-1 text-amber-300 font-semibold">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <div className="flex flex-col">
                                                            <span>Waitlist</span>
                                                            <span className="text-xs font-normal opacity-80">We will notify you via your email</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    }
                </main >
            </div >

            {/* Cancel Confirmation Dialog */}
            < ConfirmDialog
                isOpen={!!cancelDialog
                }
                title="Cancel Reservation?"
                message="Are you sure you want to cancel your Iftar reservation? Someone from the waitlist may take your spot."
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
        </div >
    )
}
