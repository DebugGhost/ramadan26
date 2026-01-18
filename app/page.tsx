import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      {/* Overlay pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

      <div className="relative">
        {/* Header */}
        <header className="border-b border-emerald-800/30 bg-slate-900/50 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Image
              src="/msa-logo.png"
              alt="UAlberta MSA"
              width={60}
              height={60}
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-white">
                UAlberta MSA
              </h1>
              <p className="text-sm text-emerald-300">Iftar Portal</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-block mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <span className="text-2xl">🌙</span>
                  <span className="text-emerald-300 font-semibold">Ramadan 2026</span>
                </div>
              </div>

              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Welcome to
                <span className="block bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
                  Ramadan Iftar
                </span>
              </h2>

              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Reserve your spot for communal Iftar meals during the blessed month of Ramadan
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
                <div className="text-4xl font-bold text-emerald-400 mb-2">235</div>
                <div className="text-sm text-gray-300">Daily Capacity</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-sm">
                <div className="text-4xl font-bold text-amber-400 mb-2">22</div>
                <div className="text-sm text-gray-300">Serving Days</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
                <div className="text-4xl font-bold text-blue-400 mb-2">10</div>
                <div className="text-sm text-gray-300">Waitlist Spots</div>
              </div>
            </div>

            {/* Sign In Card */}
            <div className="bg-slate-800/50 border border-emerald-500/20 rounded-3xl p-8 md:p-12 backdrop-blur-xl shadow-2xl">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-white mb-3">
                  Get Started
                </h3>
                <p className="text-gray-300">
                  Sign in with your <span className="text-emerald-400 font-semibold">@ualberta.ca</span> email to reserve your spot
                </p>
              </div>

              <form action="/auth/sign-in" method="post">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-5 px-8 rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-lg">Sign in with Google</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </form>

              <p className="text-sm text-gray-400 mt-6 text-center">
                🔒 Only @ualberta.ca emails are permitted
              </p>
            </div>

            {/* Volunteer Link */}
            <div className="mt-12 text-center">
              <Link
                href="/volunteer"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium group"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Volunteer Check-in Portal</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-emerald-800/30 bg-slate-900/50 backdrop-blur-xl mt-16">
          <div className="container mx-auto px-4 py-8 text-center">
            <p className="text-gray-400 text-sm mb-2">University of Alberta Muslim Students' Association</p>
            <p className="text-gray-500 text-xs">Ramadan 2026 • Feb 18 - Mar 18</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
