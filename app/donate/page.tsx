'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk'

export default function DonatePage() {
    const router = useRouter()
    const [amount, setAmount] = useState<string>('')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Parse amount to number safely
    const amountNum = parseFloat(amount)
    const isValidAmount = !isNaN(amountNum) && amountNum > 0
    const isLargeAmount = isValidAmount && amountNum > 50

    // Square Keys
    const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID
    const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID

    const handlePayment = async (token: any) => {
        setLoading(true)
        setMessage(null)

        try {
            const response = await fetch('/api/donate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId: token.token,
                    amount: amountNum,
                    email: email,
                }),
            })

            const result = await response.json()

            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: `JazakAllah Khair! Your donation of $${amountNum.toFixed(2)} was successful.`
                })
                setAmount('')
            } else {
                setMessage({
                    type: 'error',
                    text: result.error || 'Payment failed. Please try again.'
                })
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: 'An unexpected error occurred.'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSignOut = async () => {
        const form = document.createElement('form')
        form.method = 'post'
        form.action = '/auth/sign-out'
        document.body.appendChild(form)
        form.submit()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
            {/* Overlay pattern */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <div className="relative">
                {/* Header */}
                <header className="border-b border-blue-800/30 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
                            <Image
                                src="/MSAUofAlogo.webp"
                                alt="MSA UofA"
                                width={48}
                                height={48}
                                className="h-10 w-auto"
                            />
                            <div>
                                <h1 className="text-lg font-bold text-white">MSA UofA</h1>
                                <p className="text-xs text-purple-300">Donation Portal</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="text-sm text-purple-300 hover:text-white transition-colors"
                            >
                                Back to Dashboard
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-slate-800/50"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-12 max-w-2xl">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Support the Iftars
                        </h2>
                        <div className="bg-slate-800/30 border border-purple-500/20 rounded-2xl p-6 backdrop-blur-sm inline-block max-w-xl">
                            <p className="text-xl font-arabic text-purple-300 mb-2 font-semibold">
                                مَنْ فَطَّرَ صَائِمًا كَانَ لَهُ مِثْلُ أَجْرِهِ
                            </p>
                            <p className="text-gray-300 italic">
                                "Whoever gives food for a fasting person to break his fast, he will have a reward like theirs..."
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        {/* Status Message */}
                        {message && (
                            <div className={`mb-6 p-4 rounded-xl text-center font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        {/* Amount Input */}
                        <div className="mb-8">
                            <label className="block text-gray-600 text-sm font-bold mb-2 uppercase tracking-wider">
                                Donation Amount (CAD)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-gray-400">$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-10 pr-4 py-4 text-3xl font-bold text-gray-900 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                                    min="1"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        {/* Payment Area */}
                        <div>
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600 font-medium">Processing your donation...</p>
                                </div>
                            ) : !isValidAmount ? (
                                <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400">
                                    <p>Please enter an amount to proceed.</p>
                                </div>
                            ) : isLargeAmount ? (
                                /* LARGE AMOUNT -> E-TRANSFER PROMPT */
                                <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 text-center">
                                    <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-purple-900 mb-2">Please use e-Transfer</h3>
                                    <p className="text-purple-800 mb-6">
                                        For donations over $50, we kindly ask you to use e-Transfer. This saves the MSA from paying credit card processing fees, ensuring 100% of your donation goes to the cause.
                                    </p>

                                    <div className="bg-white border-2 border-purple-200 rounded-lg p-4 flex items-center justify-between gap-4 mb-2">
                                        <code className="text-lg font-mono font-bold text-gray-800 select-all">
                                            msa@ualberta.ca
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText('msa@ualberta.ca')
                                                alert('Email copied to clipboard!')
                                            }}
                                            className="text-sm font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-3 py-1 rounded transition-colors"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <p className="text-xs text-purple-500">Auto-deposit is enabled. Please put "Iftar Donation" in the memo.</p>
                                </div>
                            ) : (
                                /* REGULAR AMOUNT -> SQUARE FORM */
                                <div>
                                    <div className="mb-6">
                                        <label className="block text-gray-600 text-sm font-bold mb-2">Email Receipt To (Optional)</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                            placeholder="brother.umar@example.com"
                                        />
                                    </div>

                                    {!appId || !locationId ? (
                                        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
                                            Configuration Error: Missing Square API Keys
                                        </div>
                                    ) : (
                                        <PaymentForm
                                            applicationId={appId}
                                            locationId={locationId}
                                            cardTokenizeResponseReceived={async (token, verifiedBuyer) => {
                                                await handlePayment(token)
                                            }}
                                        >
                                            <CreditCard
                                                buttonProps={{
                                                    css: {
                                                        backgroundColor: '#7c3aed',
                                                        fontSize: '16px',
                                                        color: '#fff',
                                                        '&:hover': {
                                                            backgroundColor: '#6d28d9',
                                                        },
                                                    },
                                                }}
                                            />
                                        </PaymentForm>
                                    )}
                                    <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Secure Payment via Square
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
