/**
 * Turns a date string into a Date object
 * without turning it into local time
 * @param {string} date
 * @returns {Date}
 */
export const utcDateStringToISODate = (date: string): Date => {
  const d = date.endsWith('Z') ? date : `${date}Z`
  return new Date(d)
}

/**
 * Turn a date string into an ISO string
 * without turning it into local time
 * @param {string} date
 * @returns {string}
 */
export const utcDateStringToISOString = (date: string): string => {
  return utcDateStringToISODate(date).toISOString()
}

/**
 * Converts a Date object to a UTC date string
 * without turning it into local time
 * @param {Date} date
 * @returns {string}
 */
export const dateToUtcString = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  // YYYY-MM-DD HH:mm:ss
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
