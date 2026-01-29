import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AdminTable from './admin-table'

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

    // 4. Fetch Donations
    const { data: donations } = await supabase
        .from('donations')
        .select('amount, status')
        .eq('status', 'COMPLETED')

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

                {/* STATUS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Donation Card */}
                    <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/20 rounded-xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Total Funds Raised</p>
                                <p className="text-3xl font-bold text-white">
                                    ${donations?.reduce((sum, d) => sum + (d.amount || 0), 0).toFixed(2) || '0.00'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-gray-800 rounded-xl overflow-hidden">
                    <AdminTable days={days || []} />
                </div>
            </div>
        </div>
    )
}
