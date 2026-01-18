export default function AuthCodeError() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">
                    Authentication Error
                </h1>
                <p className="text-gray-700 mb-6">
                    There was an error during the authentication process. Please try again.
                </p>
                <a
                    href="/"
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Return Home
                </a>
            </div>
        </div>
    )
}
