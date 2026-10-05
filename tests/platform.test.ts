/*---------------------------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *--------------------------------------------------------------------------------------------*/

import * as os from 'node:os'
import * as fs from 'node:fs'
import * as platform from '../src/platform'

jest.mock('node:os')
jest.mock('node:fs')

// Load a fresh copy of the real src/platform module with node:os stubbed.
// Mocking src/platform itself would only assert that a jest.fn() returns the
// value it was handed, so the real code would never run.
const loadPlatform = (opts: { platform: NodeJS.Platform; arch: string; homedir?: string; tmpdir?: string }) => {
  let loaded: typeof import('../src/platform')
  jest.isolateModules(() => {
    const isolatedOs = require('node:os') as jest.Mocked<typeof import('node:os')>
    isolatedOs.platform.mockReturnValue(opts.platform)
    isolatedOs.arch.mockReturnValue(opts.arch as NodeJS.Architecture)
    isolatedOs.homedir.mockReturnValue(opts.homedir ?? '/home/user')
    isolatedOs.tmpdir.mockReturnValue(opts.tmpdir ?? '/tmp')
    loaded = require('../src/platform')
  })
  return loaded!
}

describe('Platform constants', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  test('should derive HOME_DIR and TEMP_DIR from os', () => {
    const p = loadPlatform({ platform: 'linux', arch: 'x64', homedir: '/home/tester', tmpdir: '/var/tmp' })

    expect(p.HOME_DIR).toBe('/home/tester')
    expect(p.TEMP_DIR).toBe('/var/tmp')
  })

  test('should expose the raw os platform and arch', () => {
    const p = loadPlatform({ platform: 'freebsd', arch: 'riscv64' })

    expect(p.OS_PLATFORM).toBe('freebsd')
    expect(p.OS_ARCH).toBe('riscv64')
  })

  test('should set IS_WINDOWS and not IS_LINUX on win32', () => {
    const p = loadPlatform({ platform: 'win32', arch: 'x64' })

    expect(p.IS_WINDOWS).toBe(true)
    expect(p.IS_LINUX).toBe(false)
    expect(p.IS_MAC).toBe(false)
  })

  test('should set IS_LINUX and not IS_MAC on linux', () => {
    const p = loadPlatform({ platform: 'linux', arch: 'x64' })

    expect(p.IS_LINUX).toBe(true)
    expect(p.IS_MAC).toBe(false)
    expect(p.IS_WINDOWS).toBe(false)
  })

  test('should set IS_MAC on darwin', () => {
    const p = loadPlatform({ platform: 'darwin', arch: 'x64' })

    expect(p.IS_MAC).toBe(true)
  })

  test('should set IS_WINDOWS_ARM only for arm64 windows', () => {
    const p = loadPlatform({ platform: 'win32', arch: 'arm64' })

    expect(p.IS_WINDOWS_ARM).toBe(true)
  })

  test('should set IS_LINUX_ARM only for arm64 linux', () => {
    const p = loadPlatform({ platform: 'linux', arch: 'arm64' })

    expect(p.IS_LINUX_ARM).toBe(true)
  })

  test('should not set IS_WINDOWS_ARM for arm64 on a non-windows platform', () => {
    const p = loadPlatform({ platform: 'darwin', arch: 'arm64' })

    expect(p.IS_WINDOWS_ARM).toBe(false)
  })
})

describe('getPlatform', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  test('should return "windows" for win32', () => {
    expect(loadPlatform({ platform: 'win32', arch: 'x64' }).getPlatform()).toBe('windows')
  })

  test('should return "warm" for arm64 windows', () => {
    expect(loadPlatform({ platform: 'win32', arch: 'arm64' }).getPlatform()).toBe('warm')
  })

  test('should return "mac" for darwin', () => {
    expect(loadPlatform({ platform: 'darwin', arch: 'x64' }).getPlatform()).toBe('mac')
  })

  test('should return "linux" for linux', () => {
    expect(loadPlatform({ platform: 'linux', arch: 'x64' }).getPlatform()).toBe('linux')
  })

  test('should return "linux" for arm64 linux', () => {
    expect(loadPlatform({ platform: 'linux', arch: 'arm64' }).getPlatform()).toBe('linux')
  })

  test('should fall back to the raw os platform name for an unknown platform', () => {
    expect(loadPlatform({ platform: 'freebsd', arch: 'x64' }).getPlatform()).toBe('freebsd')
  })
})

describe('Linux Distribution Version Detection', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  test('should return Linux distribution version from /etc/os-release', () => {
    const mockContent = 'VERSION_ID="24.04"'
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(mockContent)
    expect(platform.getLinuxDistributionVersionId()).toBe('24.04')
  })

  test('should return empty string if /etc/os-release does not exist', () => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(false)
    expect(platform.getLinuxDistributionVersionId()).toBe('')
  })

  test('should return empty string if VERSION_ID is missing', () => {
    const mockContent = 'NAME="Ubuntu"'
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(mockContent)
    expect(platform.getLinuxDistributionVersionId()).toBe('')
  })

  test('should read /etc/os-release as utf8', () => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.readFileSync as jest.Mock).mockReturnValue('VERSION_ID="22.04"')
    platform.getLinuxDistributionVersionId()
    expect(fs.readFileSync).toHaveBeenCalledWith('/etc/os-release', 'utf8')
  })
})