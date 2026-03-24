'use client'

import { useMemo } from 'react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Booking {
    id: string
    user_id: string
    day_id: string
    status: 'confirmed' | 'waitlist' | 'cancelled'
    created_at: string
    checked_in: boolean
    checked_in_at: string | null
}

interface Profile {
    id: string
    gender: 'brother' | 'sister' | null
    referral_source: string | null
    created_at: string
}

interface Day {
    date: string
    capacity_limit: number
}

interface Donation {
    id: string
    amount: number
    status: string
    created_at: string
}

interface Props {
    bookings: Booking[]
    profiles: Profile[]
    days: Day[]
    donations: Donation[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMoney(n: number) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function msToDuration(ms: number) {
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    if (mins < 1) return `${secs}s`
    if (mins < 60) return `${mins}m ${secs}s`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ${mins % 60}m`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReportClient({ bookings, profiles, days, donations }: Props) {

    const analytics = useMemo(() => {
        // — Summary Stats —
        const uniqueUsers = new Set(bookings.map(b => b.user_id)).size
        const totalBookings = bookings.filter(b => b.status === 'confirmed').length
        const totalCheckedIn = bookings.filter(b => b.checked_in).length
        const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0)
        const totalProfiles = profiles.length

        // — Quickest Days to Fill —
        const confirmedByDay: Record<string, Booking[]> = {}
        bookings.filter(b => b.status === 'confirmed').forEach(b => {
            if (!confirmedByDay[b.day_id]) confirmedByDay[b.day_id] = []
            confirmedByDay[b.day_id].push(b)
        })

        const dayCapacityMap: Record<string, number> = {}
        days.forEach(d => { dayCapacityMap[d.date] = d.capacity_limit })

        const fillTimes = days
            .map(day => {
                const dayBookings = confirmedByDay[day.date] || []
                if (dayBookings.length === 0) return null

                const times = dayBookings.map(b => new Date(b.created_at).getTime())
                const first = Math.min(...times)
                const last = Math.max(...times)
                const fillMs = last - first
                const filledCount = dayBookings.length
                const capacity = day.capacity_limit
                const fillPercent = Math.min(100, (filledCount / capacity) * 100)

                return {
                    date: day.date,
                    fillMs,
                    filledCount,
                    capacity,
                    fillPercent,
                    isFull: filledCount >= capacity,
                }
            })
            .filter((d): d is NonNullable<typeof d> => d !== null && d.isFull)
            .sort((a, b) => a.fillMs - b.fillMs)

        // — Fill Rate per Day —
        const fillRateByDay = days.map(day => {
            const dayBookings = confirmedByDay[day.date] || []
            return {
                date: day.date,
                confirmed: dayBookings.length,
                capacity: day.capacity_limit,
                percent: Math.min(100, (dayBookings.length / day.capacity_limit) * 100),
            }
        })

        // — Referral Sources —
        const referralCounts: Record<string, number> = {}
        profiles.forEach(p => {
            const source = p.referral_source || 'Not provided'
            // Group "Other: ..." into "Other"
            const key = source.startsWith('Other:') ? 'Other' : source
            referralCounts[key] = (referralCounts[key] || 0) + 1
        })
        const referralData = Object.entries(referralCounts)
            .map(([source, count]) => ({ source, count, percent: (count / totalProfiles) * 100 }))
            .sort((a, b) => b.count - a.count)

        // — Gender Breakdown —
        const brothers = profiles.filter(p => p.gender === 'brother').length
        const sisters = profiles.filter(p => p.gender === 'sister').length
        const unspecified = profiles.filter(p => !p.gender).length

        // — Check-in Rate —
        const checkinRate = totalBookings > 0 ? (totalCheckedIn / totalBookings) * 100 : 0
        const checkinByDay = days.map(day => {
            const dayConfirmed = (confirmedByDay[day.date] || [])
            const dayCheckedIn = dayConfirmed.filter(b => b.checked_in).length
            return {
                date: day.date,
                confirmed: dayConfirmed.length,
                checkedIn: dayCheckedIn,
                rate: dayConfirmed.length > 0 ? (dayCheckedIn / dayConfirmed.length) * 100 : 0,
            }
        })

        // — Donations Over Time —
        const donationsByDate: Record<string, number> = {}
        donations.forEach(d => {
            const date = d.created_at.split('T')[0]
            donationsByDate[date] = (donationsByDate[date] || 0) + d.amount
        })
        const donationTimeline = Object.entries(donationsByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, amount]) => ({ date, amount }))

        // — Busiest Booking Hours —
        const hourCounts: Record<number, number> = {}
        bookings.filter(b => b.status === 'confirmed').forEach(b => {
            // Convert to MST (UTC-7) — Edmonton is MST during Ramadan (early March to early April)
            const utcDate = new Date(b.created_at)
            const mstHour = (utcDate.getUTCHours() - 7 + 24) % 24
            hourCounts[mstHour] = (hourCounts[mstHour] || 0) + 1
        })
        const hourData = Array.from({ length: 24 }, (_, h) => ({
            hour: h,
            label: h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`,
            count: hourCounts[h] || 0,
        }))
        const peakHourCount = Math.max(...hourData.map(h => h.count), 1)

        return {
            uniqueUsers,
            totalBookings,
            totalCheckedIn,
            totalDonations,
            totalProfiles,
            fillTimes,
            fillRateByDay,
            referralData,
            brothers,
            sisters,
            unspecified,
            checkinRate,
            checkinByDay,
            donationTimeline,
            hourData,
            peakHourCount,
        }
    }, [bookings, profiles, days, donations])

    const maxDonationDay = Math.max(...analytics.donationTimeline.map(d => d.amount), 1)

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-blue-900/20" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/10 rounded-full blur-3xl" />
                <div className="relative max-w-6xl mx-auto px-6 py-10">
                    <Link href="/admin" className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-flex items-center gap-1 transition-colors">
                        ← Back to Admin
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-bold mt-2 bg-gradient-to-r from-purple-400 via-pink-300 to-blue-400 bg-clip-text text-transparent">
                        Ramadan 2026 Report
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">End-of-month analytics for the MSA Iftar Portal</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 pb-16 space-y-8">

                {/* ═══════════ Summary Stats ═══════════ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Users" value={analytics.totalProfiles.toString()} icon="👥" color="purple" />
                    <StatCard label="Confirmed Bookings" value={analytics.totalBookings.toLocaleString()} icon="📋" color="blue" />
                    <StatCard label="Checked In" value={analytics.totalCheckedIn.toLocaleString()} icon="✅" color="green" />
                    <StatCard label="Donations Raised" value={formatMoney(analytics.totalDonations)} icon="💰" color="emerald" />
                </div>

                {/* ═══════════ Quickest Days to Fill ═══════════ */}
                <Section title="🏆 Quickest Days to Fill" subtitle="Days that reached full capacity, ranked by fill speed">
                    {analytics.fillTimes.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No days reached full capacity</p>
                    ) : (
                        <div className="space-y-3">
                            {analytics.fillTimes.slice(0, 10).map((day, i) => {
                                const maxMs = analytics.fillTimes[analytics.fillTimes.length - 1].fillMs || 1
                                const barPct = Math.max(5, (day.fillMs / maxMs) * 100)
                                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
                                return (
                                    <div key={day.date} className="flex items-center gap-4">
                                        <span className="w-10 text-center text-lg font-bold shrink-0">{medal}</span>
                                        <span className="w-20 text-sm text-gray-300 shrink-0">{formatDate(day.date)}</span>
                                        <div className="flex-1 bg-slate-800 rounded-full h-8 overflow-hidden relative">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-700"
                                                style={{ width: `${barPct}%` }}
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white drop-shadow">
                                                {msToDuration(day.fillMs)} — {day.filledCount}/{day.capacity}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Section>

                {/* ═══════════ Booking Fill Rate by Day ═══════════ */}
                <Section title="📊 Daily Fill Rate" subtitle="Confirmed spots vs. capacity for each day">
                    <div className="overflow-x-auto">
                        <div className="flex items-end gap-1 min-w-[700px] h-52 px-2 pt-2 pb-6">
                            {analytics.fillRateByDay.map(day => (
                                <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                                    <div className="w-full max-w-[28px] mx-auto flex flex-col justify-end h-40">
                                        <div
                                            className={`w-full rounded-t transition-all duration-500 ${
                                                day.percent >= 100 ? 'bg-gradient-to-t from-green-600 to-emerald-400' :
                                                day.percent >= 75 ? 'bg-gradient-to-t from-blue-600 to-blue-400' :
                                                day.percent >= 50 ? 'bg-gradient-to-t from-purple-600 to-purple-400' :
                                                'bg-gradient-to-t from-gray-600 to-gray-500'
                                            }`}
                                            style={{ height: `${Math.max(2, day.percent)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-1 -rotate-45 origin-top-left whitespace-nowrap">
                                        {formatDate(day.date)}
                                    </span>
                                    {/* Tooltip on hover */}
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                        <span className="font-bold text-white">{day.confirmed}</span>
                                        <span className="text-gray-400">/{day.capacity}</span>
                                        <span className="ml-1 text-purple-300">({day.percent.toFixed(0)}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gradient-to-t from-green-600 to-emerald-400 inline-block" /> 100% Full</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gradient-to-t from-blue-600 to-blue-400 inline-block" /> 75%+</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gradient-to-t from-purple-600 to-purple-400 inline-block" /> 50%+</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gradient-to-t from-gray-600 to-gray-500 inline-block" /> &lt;50%</span>
                    </div>
                </Section>

                {/* ═══════════ Two-column row: Referral + Gender ═══════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Referral Sources */}
                    <Section title="📣 Referral Sources" subtitle="How people heard about the iftaars">
                        <div className="space-y-3">
                            {analytics.referralData.map(item => (
                                <div key={item.source}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-300">{item.source}</span>
                                        <span className="text-gray-400">{item.count} <span className="text-gray-600">({item.percent.toFixed(1)}%)</span></span>
                                    </div>
                                    <div className="w-full h-6 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-pink-600 to-purple-600 transition-all duration-700"
                                            style={{ width: `${Math.max(3, item.percent)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Gender Breakdown */}
                    <Section title="👤 Gender Breakdown" subtitle="Brother/Sister split among registered users">
                        <div className="flex flex-col items-center gap-6 py-4">
                            {/* Visual ring */}
                            <div className="relative w-44 h-44">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="12" />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none"
                                        stroke="url(#brotherGrad)"
                                        strokeWidth="12"
                                        strokeDasharray={`${(analytics.brothers / Math.max(analytics.totalProfiles, 1)) * 264} 264`}
                                        strokeLinecap="round"
                                    />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none"
                                        stroke="url(#sisterGrad)"
                                        strokeWidth="12"
                                        strokeDasharray={`${(analytics.sisters / Math.max(analytics.totalProfiles, 1)) * 264} 264`}
                                        strokeDashoffset={`${-(analytics.brothers / Math.max(analytics.totalProfiles, 1)) * 264}`}
                                        strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient id="brotherGrad"><stop stopColor="#8b5cf6" /><stop offset="1" stopColor="#6366f1" /></linearGradient>
                                        <linearGradient id="sisterGrad"><stop stopColor="#ec4899" /><stop offset="1" stopColor="#f43f5e" /></linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold">{analytics.totalProfiles}</span>
                                </div>
                            </div>
                            <div className="flex gap-8 text-center">
                                <div>
                                    <div className="text-3xl font-bold text-purple-400">{analytics.brothers}</div>
                                    <div className="text-sm text-gray-400">Brothers ({((analytics.brothers / Math.max(analytics.totalProfiles, 1)) * 100).toFixed(0)}%)</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-pink-400">{analytics.sisters}</div>
                                    <div className="text-sm text-gray-400">Sisters ({((analytics.sisters / Math.max(analytics.totalProfiles, 1)) * 100).toFixed(0)}%)</div>
                                </div>
                                {analytics.unspecified > 0 && (
                                    <div>
                                        <div className="text-3xl font-bold text-gray-500">{analytics.unspecified}</div>
                                        <div className="text-sm text-gray-400">Unspecified</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Section>
                </div>

                {/* ═══════════ Check-in Rate ═══════════ */}
                <Section title="✅ Check-in Rate" subtitle="How many confirmed attendees actually showed up">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Big stat */}
                        <div className="flex flex-col items-center gap-2 min-w-[160px]">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="10" />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none"
                                        stroke="url(#checkinGrad)"
                                        strokeWidth="10"
                                        strokeDasharray={`${(analytics.checkinRate / 100) * 264} 264`}
                                        strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient id="checkinGrad"><stop stopColor="#22c55e" /><stop offset="1" stopColor="#10b981" /></linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-green-400">{analytics.checkinRate.toFixed(0)}%</span>
                                </div>
                            </div>
                            <span className="text-sm text-gray-400">{analytics.totalCheckedIn} / {analytics.totalBookings} confirmed</span>
                        </div>

                        {/* Per-day bars */}
                        <div className="flex-1 w-full overflow-x-auto">
                            <div className="flex items-end gap-1 min-w-[700px] h-36 px-2 pt-2 pb-6">
                                {analytics.checkinByDay.map(day => (
                                    <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                                        <div className="w-full max-w-[28px] mx-auto flex flex-col justify-end h-28">
                                            <div
                                                className="w-full rounded-t bg-gradient-to-t from-green-700 to-green-400 transition-all"
                                                style={{ height: `${Math.max(2, day.rate)}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-1 -rotate-45 origin-top-left whitespace-nowrap">
                                            {formatDate(day.date)}
                                        </span>
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                            <span className="font-bold text-green-400">{day.checkedIn}</span>
                                            <span className="text-gray-400">/{day.confirmed}</span>
                                            <span className="ml-1 text-gray-300">({day.rate.toFixed(0)}%)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* ═══════════ Two-column row: Donations + Booking Hours ═══════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Donations Over Time */}
                    <Section title="💰 Donations Over Time" subtitle="Daily donation totals">
                        {analytics.donationTimeline.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No donations recorded</p>
                        ) : (
                            <div className="space-y-2">
                                {analytics.donationTimeline.map(d => (
                                    <div key={d.date} className="flex items-center gap-3">
                                        <span className="w-16 text-xs text-gray-400 shrink-0">{formatDate(d.date)}</span>
                                        <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-green-400 transition-all"
                                                style={{ width: `${Math.max(4, (d.amount / maxDonationDay) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-emerald-300 w-24 text-right shrink-0">{formatMoney(d.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* Busiest Booking Hours */}
                    <Section title="⏰ Booking Times (MST)" subtitle="When people made their reservations">
                        <div className="flex items-end gap-px h-40 px-1">
                            {analytics.hourData.map(h => (
                                <div key={h.hour} className="flex-1 flex flex-col items-center group relative">
                                    <div className="w-full flex flex-col justify-end h-32">
                                        <div
                                            className={`w-full rounded-t transition-all ${
                                                h.count === analytics.peakHourCount && h.count > 0
                                                    ? 'bg-gradient-to-t from-amber-600 to-yellow-400'
                                                    : 'bg-gradient-to-t from-blue-700 to-blue-400'
                                            }`}
                                            style={{ height: `${Math.max(1, (h.count / analytics.peakHourCount) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] text-gray-500 mt-1">{h.label}</span>
                                    {h.count > 0 && (
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-gray-700 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                            {h.count} bookings
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Section>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-600 text-sm pt-8 border-t border-gray-800/50">
                    Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • MSA Iftar Portal
                </div>
            </div>
        </div>
    )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
    const colorMap: Record<string, string> = {
        purple: 'from-purple-900/30 to-purple-900/10 border-purple-500/20',
        blue: 'from-blue-900/30 to-blue-900/10 border-blue-500/20',
        green: 'from-green-900/30 to-green-900/10 border-green-500/20',
        emerald: 'from-emerald-900/30 to-emerald-900/10 border-emerald-500/20',
    }

    return (
        <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.purple} border rounded-xl p-5 relative overflow-hidden`}>
            <div className="absolute top-3 right-3 text-3xl opacity-20">{icon}</div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{label}</p>
            <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
        </div>
    )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div className="bg-slate-900/70 border border-gray-800/60 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
            <p className="text-sm text-gray-500 mb-5">{subtitle}</p>
            {children}
        </div>
    )
}
