/**
 * Parses naive API ISO strings ("2026-07-29T10:00:00") directly into exact wall-clock Date objects
 * without adding/subtracting local browser timezone offset (+5:30 IST shift).
 */
export function parseNaiveDT(isoStr) {
  if (!isoStr) return new Date()
  const clean = String(isoStr).replace('Z', '').split('+')[0]
  const [dPart, tPart] = clean.split('T')
  if (dPart && tPart) {
    const [y, m, d] = dPart.split('-').map(Number)
    const [h, min, s] = tPart.split(':').map(Number)
    return new Date(y, m - 1, d, h, min, s || 0)
  }
  return new Date(isoStr)
}

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
  const d = parseNaiveDT(isoString)
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
  const d = parseNaiveDT(isoString)
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
