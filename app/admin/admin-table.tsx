'use client'

import { useState } from 'react'
import { updateDailyCapacity, getWaitlistedUsers } from './actions'

interface Day {
    date: string
    is_open: boolean
    capacity_limit: number
    volunteer_pin: string | null
    confirmed_count?: number
    waitlist_count?: number
}

export default function AdminTable({ days }: { days: Day[] }) {
    // We track editing state for each row
    const [editingDate, setEditingDate] = useState<string | null>(null)
    const [tempCapacity, setTempCapacity] = useState<number>(235)
    const [loading, setLoading] = useState(false)

    // Waitlist Modal State
    const [waitlistModalOpen, setWaitlistModalOpen] = useState(false)
    const [waitlistData, setWaitlistData] = useState<any[]>([])
    const [viewingDate, setViewingDate] = useState('')

    const handleEdit = (day: Day) => {
        setEditingDate(day.date)
        setTempCapacity(day.capacity_limit)
    }

    const handleSave = async (date: string) => {
        setLoading(true)
        try {
            await updateDailyCapacity(date, tempCapacity)
            setEditingDate(null)
        } catch (error) {
            alert('Failed to update capacity')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        setEditingDate(null)
    }

    const handleViewWaitlist = async (date: string) => {
        setLoading(true)
        try {
            const users = await getWaitlistedUsers(date)
            setWaitlistData(users)
            setViewingDate(date)
            setWaitlistModalOpen(true)
        } catch (error) {
            alert('Failed to fetch waitlist')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="overflow-x-auto relative">
            <table className="w-full text-left">
                <thead className="bg-slate-800 border-b border-gray-700">
                    <tr>
                        <th className="p-4 font-semibold text-gray-300">Date</th>
                        <th className="p-4 font-semibold text-gray-300">Status</th>
                        <th className="p-4 font-semibold text-blue-300">Signed Up</th>
                        <th className="p-4 font-semibold text-yellow-300">Waitlisted</th>
                        <th className="p-4 font-semibold text-gray-300">Capacity</th>
                        <th className="p-4 font-semibold text-purple-300">Volunteer PIN</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {days?.map((day) => (
                        <tr key={day.date} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-4">
                                {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${day.is_open
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                    {day.is_open ? 'Open' : 'Closed'}
                                </span>
                            </td>
                            <td className="p-4 font-mono font-medium text-blue-400">
                                {day.confirmed_count || 0}
                            </td>
                            <td className="p-4">
                                <button
                                    onClick={() => handleViewWaitlist(day.date)}
                                    className="font-mono font-medium text-yellow-400 hover:text-yellow-300 hover:underline text-left"
                                >
                                    {day.waitlist_count || 0} / 50
                                </button>
                            </td>
                            <td className="p-4 text-gray-400">
                                {editingDate === day.date ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={tempCapacity}
                                            onChange={(e) => setTempCapacity(parseInt(e.target.value))}
                                            className="w-20 bg-slate-800 border border-gray-600 rounded px-2 py-1 text-white focus:border-purple-500 outline-none"
                                        />
                                        <button
                                            onClick={() => handleSave(day.date)}
                                            disabled={loading}
                                            className="bg-green-600 hover:bg-green-500 text-white p-1 rounded"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            disabled={loading}
                                            className="bg-red-600 hover:bg-red-500 text-white p-1 rounded"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group">
                                        <span>{day.capacity_limit}</span>
                                        <button
                                            onClick={() => handleEdit(day)}
                                            className="opacity-0 group-hover:opacity-100 text-purple-400 hover:text-purple-300 transition-opacity"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </td>
                            <td className="p-4 font-mono text-lg font-bold text-purple-400 tracking-wider">
                                {day.volunteer_pin || '----'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Waitlist Modal */}
            {waitlistModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-gray-700 rounded-xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">Waitlist Details</h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    {new Date(viewingDate + 'T00:00:00').toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                            <button
                                onClick={() => setWaitlistModalOpen(false)}
                                className="text-gray-400 hover:text-white bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto pr-2 space-y-3 flex-1">
                            {waitlistData.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-lg">
                                    No users on the waitlist for this day.
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {waitlistData.map((user, i) => (
                                        <li key={i} className="bg-slate-800/50 p-4 rounded-lg border border-gray-700 flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-white">{user.full_name}</p>
                                                <p className="text-sm text-gray-400">{user.email}</p>
                                            </div>
                                            <span className="text-xs font-mono text-gray-500 bg-slate-900 px-2 py-1 rounded border border-gray-800">
                                                {new Date(user.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
