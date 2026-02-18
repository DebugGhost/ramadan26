'use client'

import { useState } from 'react'
import { updateDailyCapacity } from './actions'

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

    return (
        <div className="overflow-x-auto">
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
                            <td className="p-4 font-mono font-medium text-yellow-400">
                                {day.waitlist_count || 0}
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
        </div>
    )
}
