/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import { compare } from '../src/versions'

describe('compare function', () => {
  test('returns 0 for identical versions', () => {
    expect(compare('1.0.0', '1.0.0')).toBe(0)
    expect(compare('2.5.3', '2.5.3')).toBe(0)
  })

  test('handles different major versions', () => {
    expect(compare('2.0.0', '1.9.9')).toBe(1)
    expect(compare('1.0.0', '2.0.0')).toBe(-1)
  })

  test('handles different minor versions', () => {
    expect(compare('1.2.0', '1.1.9')).toBe(1)
    expect(compare('1.3.5', '1.4.0')).toBe(-1)
  })

  test('handles different patch versions', () => {
    expect(compare('1.0.1', '1.0.0')).toBe(1)
    expect(compare('1.0.0', '1.0.2')).toBe(-1)
  })

  test('handles versions with different segment lengths', () => {
    expect(compare('1.0', '1.0.0')).toBe(0)
    expect(compare('1.0.1', '1.0')).toBe(1)
    expect(compare('1.0', '1.0.1')).toBe(-1)
  })

  test('handles leading zeros in version numbers', () => {
    expect(compare('1.01.0', '1.1.0')).toBe(0)
    expect(compare('1.02.0', '1.1.9')).toBe(1)
    expect(compare('1.0.0', '1.00.00')).toBe(0)
  })
})
