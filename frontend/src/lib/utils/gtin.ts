/**
 * Utility functions for GTIN/EAN code handling
 */

/**
 * Format a GTIN/EAN code with leading zeros to the correct length
 *
 * GTIN standard lengths:
 * - GTIN-8: 8 digits
 * - GTIN-12 (UPC): 12 digits
 * - GTIN-13 (EAN-13): 13 digits
 * - GTIN-14: 14 digits
 *
 * @param gtin - The GTIN code to format (can be string or number)
 * @returns Formatted GTIN with leading zeros, or original value if invalid
 */
export function formatGtin(gtin: string | number | null | undefined): string {
  if (!gtin) return ''

  // Convert to string and remove any whitespace, dashes, or non-numeric characters
  const cleaned = String(gtin).trim().replace(/[^0-9]/g, '')

  if (!cleaned) return ''

  const length = cleaned.length

  // If already correct length, return as-is
  if ([8, 12, 13, 14].includes(length)) {
    return cleaned
  }

  // If shorter than standard lengths, pad with leading zeros
  // Determine target length based on current length
  let targetLength = 13 // Default to EAN-13

  if (length <= 8) {
    targetLength = 8  // GTIN-8
  } else if (length <= 12) {
    targetLength = 12 // GTIN-12
  } else if (length <= 13) {
    targetLength = 13 // GTIN-13/EAN-13
  } else if (length <= 14) {
    targetLength = 14 // GTIN-14
  } else {
    // If longer than 14 digits, return as-is (invalid GTIN)
    return cleaned
  }

  return cleaned.padStart(targetLength, '0')
}

/**
 * Validate if a GTIN code has a valid length
 *
 * @param gtin - The GTIN code to validate
 * @returns true if valid length (8, 12, 13, or 14 digits)
 */
export function isValidGtinLength(gtin: string | number | null | undefined): boolean {
  if (!gtin) return false

  const cleaned = String(gtin).trim().replace(/[^0-9]/g, '')
  const length = cleaned.length

  return [8, 12, 13, 14].includes(length)
}

/**
 * Get the GTIN type based on length
 *
 * @param gtin - The GTIN code
 * @returns GTIN type (GTIN-8, GTIN-12, GTIN-13, GTIN-14) or null if invalid
 */
export function getGtinType(gtin: string | number | null | undefined): string | null {
  if (!gtin) return null

  const cleaned = String(gtin).trim().replace(/[^0-9]/g, '')
  const length = cleaned.length

  switch (length) {
    case 8:
      return 'GTIN-8'
    case 12:
      return 'GTIN-12 (UPC)'
    case 13:
      return 'GTIN-13 (EAN-13)'
    case 14:
      return 'GTIN-14'
    default:
      return null
  }
}
