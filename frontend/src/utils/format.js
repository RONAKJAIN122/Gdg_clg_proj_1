/**
 * Formats "09:00" or "21:00" to "9:00 AM" or "9:00 PM"
 */
export function formatTime12(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/**
 * Formats Date ISO string to readable AM/PM format: "Mon, 28 Jul, 9:30 AM"
 */
export function formatDateTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Formats time portion of Date ISO string: "9:30 AM"
 */
export function formatTimeOnly(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
