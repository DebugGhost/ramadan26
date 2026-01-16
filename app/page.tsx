import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-emerald-800">
            UAlberta MSA Iftar Portal
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <h2 className="text-5xl font-bold text-gray-900 mb-4">
              Welcome to Ramadan 2026
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Daily Iftar Reservations
            </p>
            <p className="text-lg text-gray-500">
              Reserve your spot for communal Iftar meals during Ramadan
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="text-3xl font-bold text-emerald-600 mb-2">235</div>
              <div className="text-sm text-gray-600">Daily Capacity</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="text-3xl font-bold text-emerald-600 mb-2">22</div>
              <div className="text-sm text-gray-600">Serving Days</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="text-3xl font-bold text-emerald-600 mb-2">10</div>
              <div className="text-sm text-gray-600">Waitlist Spots</div>
            </div>
          </div>

          {/* Sign In Button */}
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Get Started
            </h3>
            <p className="text-gray-600 mb-6">
              Sign in with your @ualberta.ca email to reserve your spot
            </p>
            <form action="/auth/sign-in" method="post">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
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
                Sign in with Google
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-4">
              Only @ualberta.ca emails are permitted
            </p>
          </div>

          {/* Volunteer Link */}
          <div className="mt-8">
            <Link
              href="/volunteer"
              className="text-emerald-600 hover:text-emerald-700 underline text-sm"
            >
              Volunteer Check-in Portal →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>University of Alberta Muslim Students' Association</p>
          <p className="mt-1">Ramadan 2026 • Feb 18 - Mar 18</p>
        </div>
      </footer>
    </div>
  )
}
