import Fuse from 'fuse.js'

/**
 * Normalize Arabic/Islamic name transliteration variants
 * so common spelling differences don't prevent matches.
 *
 * Examples:
 *   Mohammed, Muhammad, Muhammed, Mohamad → all normalize the same
 *   Fatima, Fatimah → same
 *   Khalid, Kalid → same
 *   Al-Rahman, Elrahman, Ul-Rahman → same
 */
export function normalizeArabicName(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics (é → e)
        .replace(/[_\-']/g, '')          // strip hyphens, apostrophes (al-rahman → alrahman)
        .replace(/^(al|el|ul)/g, 'al')   // normalize al-/el-/ul- prefix
        .replace(/kh/g, 'k')             // khalid / kalid
        .replace(/sh/g, 's')             // shams / sams
        .replace(/th/g, 't')             // uthman / utman
        .replace(/dh/g, 'z')             // dhahir / zahir
        .replace(/gh/g, 'g')             // ghalib / galib
        .replace(/ph/g, 'f')             // not Arabic but common
        .replace(/[ou]/g, 'o')           // o/u interchangeable (hussein / hossein)
        .replace(/[ae]/g, 'a')           // a/e interchangeable (ahmed / ehmed)
        .replace(/ee/g, 'i')             // ee → i (ameen / amin)
        .replace(/(.)\1+/g, '$1')        // collapse repeated letters (mohammed → mohamd)
        .replace(/h$/, '')               // trailing h optional (fatimah → fatima)
        .replace(/y$/, 'i')              // trailing y → i (aly → ali)
}

/**
 * Create a Fuse instance for searching bookings with fuzzy + Arabic normalization.
 *
 * Searches across full_name and email with normalized Arabic name matching.
 */
export function createBookingSearch<T extends { profiles: { full_name?: string | null; email: string } }>(
    bookings: T[]
): Fuse<T> {
    return new Fuse(bookings, {
        keys: [
            { name: 'profiles.full_name', weight: 2 },
            { name: 'profiles.email', weight: 1 },
        ],
        threshold: 0.35,       // fairly forgiving — lower = stricter
        distance: 100,
        ignoreLocation: true,  // match anywhere in the string
        getFn: (obj, path) => {
            // Walk the nested path to get the raw value
            const value = path.reduce<unknown>((current, key) => {
                if (current && typeof current === 'object' && key in current) {
                    return (current as Record<string, unknown>)[key]
                }
                return ''
            }, obj)

            const str = typeof value === 'string' ? value : ''

            // Return both original and normalized so Fuse can match either
            return [str.toLowerCase(), normalizeArabicName(str)]
        },
    })
}
