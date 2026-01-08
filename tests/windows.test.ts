/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

// Mock child process and core
jest.mock('node:child_process', () => ({ execSync: jest.fn() }))
jest.mock('child_process', () => ({ execSync: jest.fn() }))
jest.mock('@actions/core')

import * as child from 'node:child_process'
import * as core from '@actions/core'
import * as windows from '../src/windows'

describe('windows registry helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('registerDriverInWindowsRegistry calls reg commands and logs info on success', () => {
    ;(child.execSync as jest.Mock).mockImplementation(() => Buffer.from(''))

    const icdPath = 'C:\\fake\\driver\\icd.json'
    windows.registerDriverInWindowsRegistry(icdPath)

    expect(child.execSync).toHaveBeenCalledTimes(2)
    expect((child.execSync as jest.Mock).mock.calls[0][0]).toContain('reg add')
    expect((core.info as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Successfully registered ICD'))
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('reg delete'))
  })

  test('registerDriverInWindowsRegistry warns on execSync error', () => {
    ;(child.execSync as jest.Mock).mockImplementation(() => {
      throw new Error('access denied')
    })

    const icdPath = 'C:\\fake\\driver\\icd.json'
    windows.registerDriverInWindowsRegistry(icdPath)

    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Failed to register ICD:'))
  })
})
