import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export default async function AdminPage() {
    const supabase = await createClient()

    // 1. Check Authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        redirect('/auth/sign-in')
    }

    // 2. Check Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                    <p className="text-gray-400">You do not have permission to view this page.</p>
                </div>
            </div>
        )
    }

    // 3. Fetch Days and PINS
    const { data: days } = await supabase
        .from('days')
        .select('*')
        .order('date', { ascending: true })

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                        <p className="text-gray-400">Manage daily configurations and view PINs</p>
                    </div>
                    <div className="bg-purple-900/30 px-4 py-2 rounded-lg border border-purple-500/30">
                        Logged in as Admin
                    </div>
                </div>

                <div className="bg-slate-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800 border-b border-gray-700">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-300">Date</th>
                                    <th className="p-4 font-semibold text-gray-300">Status</th>
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
                                        <td className="p-4 text-gray-400">
                                            {day.capacity_limit}
                                        </td>
                                        <td className="p-4 font-mono text-lg font-bold text-purple-400 tracking-wider">
                                            {day.volunteer_pin || '----'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
