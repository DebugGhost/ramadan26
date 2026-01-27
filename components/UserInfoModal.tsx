'use client'

import { useState } from 'react'
import { updateProfile } from '@/app/dashboard/actions'

interface Props {
    isOpen: boolean
    onSuccess: () => void
}

export default function UserInfoModal({ isOpen, onSuccess }: Props) {
    const [gender, setGender] = useState<'brother' | 'sister' | ''>('')
    const [referralSource, setReferralSource] = useState('')
    const [otherSource, setOtherSource] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!gender) {
            setError('Please select if you are a brother or sister')
            return
        }

        if (!referralSource) {
            setError('Please tell us how you found out about the iftaars')
            return
        }

        const finalSource = referralSource === 'Other' ? `Other: ${otherSource}` : referralSource
        if (referralSource === 'Other' && !otherSource.trim()) {
            setError('Please specify how you found out')
            return
        }

        setLoading(true)
        const result = await updateProfile(gender, finalSource)
        setLoading(false)

        if (result.success) {
            onSuccess()
        } else {
            setError(result.message)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-purple-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <svg className="w-32 h-32 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L1 21h22L12 2zm0 3.8L19.5 19H4.5L12 5.8z" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-white mb-2">One-time Setup</h2>
                    <p className="text-gray-400 mb-6">Please provide a few details to complete your profile. You only need to do this once.</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Gender Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-purple-300">Are you a brother or a sister? *</label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`
                                    cursor-pointer p-3 rounded-xl border-2 transition-all text-center
                                    ${gender === 'brother'
                                        ? 'bg-purple-500/20 border-purple-500 text-white'
                                        : 'bg-slate-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}
                                `}>
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="brother"
                                        checked={gender === 'brother'}
                                        onChange={() => setGender('brother')}
                                        className="hidden"
                                    />
                                    <span className="font-semibold">Brother</span>
                                </label>
                                <label className={`
                                    cursor-pointer p-3 rounded-xl border-2 transition-all text-center
                                    ${gender === 'sister'
                                        ? 'bg-purple-500/20 border-purple-500 text-white'
                                        : 'bg-slate-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}
                                `}>
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="sister"
                                        checked={gender === 'sister'}
                                        onChange={() => setGender('sister')}
                                        className="hidden"
                                    />
                                    <span className="font-semibold">Sister</span>
                                </label>
                            </div>
                        </div>

                        {/* Referral Source */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-purple-300">How did you find out about the iftaars? *</label>
                            <div className="space-y-2">
                                {['Mailing list', 'WhatsApp/Discord', 'Instagram', 'Friends'].map((option) => (
                                    <label key={option} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-gray-700/50 cursor-pointer hover:bg-slate-800/50 transition-colors">
                                        <input
                                            type="radio"
                                            name="referral"
                                            value={option}
                                            checked={referralSource === option}
                                            onChange={(e) => setReferralSource(e.target.value)}
                                            className="w-4 h-4 text-purple-500 focus:ring-purple-500 bg-slate-900 border-gray-600"
                                        />
                                        <span className="text-gray-300">{option}</span>
                                    </label>
                                ))}

                                <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-gray-700/50 cursor-pointer hover:bg-slate-800/50 transition-colors">
                                    <input
                                        type="radio"
                                        name="referral"
                                        value="Other"
                                        checked={referralSource === 'Other'}
                                        onChange={(e) => setReferralSource(e.target.value)}
                                        className="w-4 h-4 text-purple-500 focus:ring-purple-500 bg-slate-900 border-gray-600"
                                    />
                                    <span className="text-gray-300">Other</span>
                                </label>

                                {referralSource === 'Other' && (
                                    <input
                                        type="text"
                                        placeholder="Please specify..."
                                        value={otherSource}
                                        onChange={(e) => setOtherSource(e.target.value)}
                                        className="w-full mt-2 bg-slate-900 border border-purple-500/30 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none"
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? 'Saving...' : 'Save & Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
