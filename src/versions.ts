/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

/**
 * Compare two version numbers.
 *
 * @param {string} ver1 - The first version number string.
 * @param {string} ver2 - The second version number string.
 * @returns {number} Returns -1 if ver1 is less than ver2, 1 if ver1 is greater than ver2, or 0 if they are equal.
 */
export function compare(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] ?? 0 // Default missing segments to 0
    const num2 = parts2[i] ?? 0

    if (num1 < num2) return -1
    if (num1 > num2) return 1
  }

  return 0
}
