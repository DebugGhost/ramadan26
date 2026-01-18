/**
 * Get today's date in Edmonton/Mountain Time
 * This ensures the app works correctly even when deployed on servers in UTC
 */
export function getTodayInEdmonton(): string {
    return new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Edmonton'
    }) // Returns format: YYYY-MM-DD
}

export function getTomorrowInEdmonton(): string {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Edmonton' }))
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    return tomorrow.toLocaleDateString('en-CA', {
        timeZone: 'America/Edmonton'
    })
}

export function getCurrentHourInEdmonton(): number {
    const timeString = new Date().toLocaleTimeString('en-US', {
        timeZone: 'America/Edmonton',
        hour12: false,
        hour: 'numeric'
    })
    return parseInt(timeString, 10)
}
