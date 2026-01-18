/**
 * Get today's date in Edmonton/Mountain Time
 * This ensures the app works correctly even when deployed on servers in UTC
 */
export function getTodayInEdmonton(): string {
    return new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Edmonton'
    }) // Returns format: YYYY-MM-DD
}
