/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as tc from '@actions/tool-cache'
import * as platform from '../src/platform'
import { extract } from '../src/archive'

jest.mock('@actions/tool-cache', () => ({
  __esModule: true,
  extractTar: jest.fn(),
  extractZip: jest.fn(),
  extract7z: jest.fn()
}))

describe('extract function', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns destination for .exe files on IS_WINDOWS', async () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: true })
    const result = await extract('test.exe', '/destination')
    expect(result).toBe('/destination')
  })

  it('returns destination for .exe files on IS_WINDOWS_ARM', async () => {
    Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: true })
    const result = await extract('test.exe', '/destination')
    expect(result).toBe('/destination')
  })

  it('calls extractZip for .zip files on Windows', async () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: true })
    jest.spyOn(tc, 'extractZip').mockResolvedValue('/destination')
    const result = await extract('test.zip', '/destination')
    expect(tc.extractZip).toHaveBeenCalledWith('test.zip', '/destination')
    expect(result).toBe('/destination')
  })

  it('calls extract7z for .7z files on Windows', async () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: true })
    jest.spyOn(tc, 'extract7z').mockResolvedValue('/destination')
    const result = await extract('test.7z', '/destination')
    expect(tc.extract7z).toHaveBeenCalledWith('test.7z', '/destination')
    expect(result).toBe('/destination')
  })

  it('calls extractTar for .tar.gz files on Linux', async () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: false })
    Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false })
    Object.defineProperty(platform, 'IS_LINUX', { value: true })
    ;(tc.extractTar as jest.Mock).mockResolvedValue('/destination')
    const result = await extract('test.tar.gz', '/destination')
    expect(tc.extractTar).toHaveBeenCalledWith('test.tar.gz', '/destination')
    expect(result).toBe('/destination')
  })

  it('calls extractTar for .tar.gz files on Linux ARM', async () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: false })
    Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false })
    Object.defineProperty(platform, 'IS_LINUX', { value: false })
    Object.defineProperty(platform, 'IS_LINUX_ARM', { value: true })
    ;(tc.extractTar as jest.Mock).mockResolvedValue('/destination')
    const result = await extract('test.tar.gz', '/destination')
    expect(tc.extractTar).toHaveBeenCalledWith('test.tar.gz', '/destination')
    expect(result).toBe('/destination')
  })

  it('calls extractTar with flags for .tar.xz files on Linux', async () => {
    Object.defineProperty(platform, 'IS_LINUX', { value: true })
    jest.spyOn(tc, 'extractTar').mockResolvedValue('/destination')
    const result = await extract('test.tar.xz', '/destination')
    expect(tc.extractTar).toHaveBeenCalledWith('test.tar.xz', '/destination', ['-xJ'])
    expect(result).toBe('/destination')
  })

  it('calls extractZip for .zip files on macOS', async () => {
    Object.defineProperty(platform, 'IS_MAC', { value: true })
    jest.spyOn(tc, 'extractZip').mockResolvedValue('/destination')
    const result = await extract('test.zip', '/destination')
    expect(tc.extractZip).toHaveBeenCalledWith('test.zip', '/destination')
    expect(result).toBe('/destination')
  })

  it('returns destination for .dmg files on macOS', async () => {
    Object.defineProperty(platform, 'IS_MAC', { value: true })
    const result = await extract('test.dmg', '/destination')
    expect(result).toBe('/destination')
  })

  it('throws an error for unsupported file types on Windows', async () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: true })
    await expect(extract('test.unknown', '/destination')).rejects.toThrow('The file type is unsupported: test.unknown')
  })
  it('throws an error for unsupported file types on Linux', async () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: false })
    Object.defineProperty(platform, 'IS_LINUX', { value: true })
    Object.defineProperty(platform, 'IS_MAC', { value: false })
    await expect(extract('test.unknown', '/destination')).rejects.toThrow('The file type is unsupported: test.unknown')
  })

  it('throws an error for unsupported file types on macOS', async () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: false })
    Object.defineProperty(platform, 'IS_MAC', { value: true })
    await expect(extract('test.unknown', '/destination')).rejects.toThrow('The file type is unsupported: test.unknown')
  })

  it('throws an error for unsupported platforms', async () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: false })
    Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false })
    Object.defineProperty(platform, 'IS_MAC', { value: false })
    Object.defineProperty(platform, 'IS_LINUX', { value: false })
    Object.defineProperty(platform, 'IS_LINUX_ARM', { value: false })
    await expect(extract('test.unknown', '/destination')).rejects.toThrow('Unsupported platform:')
  })
})
