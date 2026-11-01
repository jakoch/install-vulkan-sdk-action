/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as fs from 'fs'
import * as path from 'path'

jest.mock('@actions/core')

// We'll load the module dynamically so each test gets a fresh instance.
const tmpDir = path.join(__dirname, 'tmp_verify')

beforeAll(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true })
  } catch (e) {
    // ignore
  }
  fs.mkdirSync(tmpDir, { recursive: true })
})

afterAll(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true })
  } catch (e) {
    // ignore
  }
})

describe('verify helpers', () => {
  const filePath = path.join(tmpDir, 'file.txt')

  beforeEach(() => {
    jest.resetModules()
  })

  it('computeFileSha256 returns correct sha for known content', async () => {
    const content = 'hello world' // known SHA256: b94d27b9934d3e08a52e52d7da7dabfadeb06b... full below
    fs.writeFileSync(filePath, content)

    // load module normally but call computeFileSha256 directly (it's exported)
    const verify = require('../src/verify')
    const sha = await verify.computeFileSha256(filePath)
    expect(sha).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')
  })

  it('compareFileSha returns true for matching sha', async () => {
    jest.resetModules()
    const verify = require('../src/verify')

    fs.writeFileSync(filePath, 'some content')
    const expected = await verify.computeFileSha256(filePath)
    const result = await verify.compareFileSha(filePath, expected, false)
    expect(result).toBe(true)
  })

  it('compareFileSha returns false and calls core.setFailed on mismatch when failOnMismatch=true', async () => {
    jest.resetModules()
    const core = require('@actions/core')
    const spy = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined)

    const verify = require('../src/verify')
    fs.writeFileSync(filePath, 'different content')
    const fakeExpected = '0000000000000000000000000000000000000000000000000000000000000000'
    const result = await verify.compareFileSha(filePath, fakeExpected, true)
    expect(result).toBe(false)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('compareFileSha returns false and calls setFailed when file missing', async () => {
    jest.resetModules()
    const core = require('@actions/core')
    const spy = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined)

    const verify = require('../src/verify')
    const missing = path.join(tmpDir, 'does-not-exist.txt')
    const result = await verify.compareFileSha(missing, 'abc', true)
    expect(result).toBe(false)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('compareFileSha does not call setFailed when failOnMismatch=false', async () => {
    jest.resetModules()
    const core = require('@actions/core')
    const spy = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined)

    const verify = require('../src/verify')
    fs.writeFileSync(filePath, 'content here')
    const result = await verify.compareFileSha(filePath, 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', false)
    expect(result).toBe(false)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('computeFileSha256 rejects for non-existent file', async () => {
    jest.resetModules()
    const verify = require('../src/verify')
    const missing = path.join(tmpDir, 'no-file.txt')
    await expect(verify.computeFileSha256(missing)).rejects.toBeDefined()
  })

  it('compareFileSha does not bypass verification under Jest', async () => {
    // The production code must not branch on the test runner. Assert that a
    // genuine mismatch is still detected while JEST_WORKER_ID is set.
    process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1'
    jest.resetModules()
    const core = require('@actions/core')
    const errorSpy = jest.spyOn(core, 'error').mockImplementation(() => undefined)
    const setFailedSpy = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined)

    const verify = require('../src/verify')
    fs.writeFileSync(filePath, 'some content')
    const actual = await verify.computeFileSha256(filePath)
    const wrong = actual === 'a'.repeat(64) ? 'b'.repeat(64) : 'a'.repeat(64)

    const result = await verify.compareFileSha(filePath, wrong, true)
    expect(result).toBe(false)
    expect(errorSpy).toHaveBeenCalled()
    expect(setFailedSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
    setFailedSpy.mockRestore()
  })

  it('compareFileSha catch block handles compute error and calls setFailed', async () => {
    jest.resetModules()

    // Mock computeFileSha256 to throw when called
    const verifyModule = require('../src/verify')
    const core = require('@actions/core')
    const errorSpy = jest.spyOn(core, 'error').mockImplementation(() => undefined)
    const setFailedSpy = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined)

    // Replace the computeFileSha256 export with a function that rejects
    const originalCompute = verifyModule.computeFileSha256
    verifyModule.computeFileSha256 = () => { throw new Error('boom') }

    // Ensure file exists so the code proceeds to computeFileSha256
    fs.writeFileSync(filePath, 'will throw')
    const result = await verifyModule.compareFileSha(filePath, 'irrelevant', true)
    expect(result).toBe(false)
    expect(errorSpy).toHaveBeenCalled()
    expect(setFailedSpy).toHaveBeenCalled()

    // restore
    verifyModule.computeFileSha256 = originalCompute
    errorSpy.mockRestore()
    setFailedSpy.mockRestore()
  })

// Mock node:fs before loading src/verify so the throw originates inside its
  // try block. isolateModules is synchronous, so the module and spies are captured
  // there and the promise is awaited outside.
  const runCompareFileShaWithThrowingFs = async (
    thrown: unknown,
    failOnMismatch: boolean
  ): Promise<{ result: boolean; errorSpy: jest.SpyInstance; setFailedSpy: jest.SpyInstance }> => {
    let result!: boolean
    let errorSpy!: jest.SpyInstance
    let setFailedSpy!: jest.SpyInstance
    let promise!: Promise<boolean>

    jest.isolateModules(() => {
      jest.doMock('node:fs', () => ({
        ...jest.requireActual('node:fs'),
        existsSync: () => {
          throw thrown
        }
      }))
      const verifyModule = require('../src/verify')
      const core = require('@actions/core')
      errorSpy = jest.spyOn(core, 'error').mockImplementation(() => undefined)
      setFailedSpy = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined)
      promise = verifyModule.compareFileSha(filePath, 'irrelevant', failOnMismatch)
    })

    result = await promise
    return { result, errorSpy, setFailedSpy }
  }

  it('compareFileSha catch block handles a non-Error throw', async () => {
    const { result, errorSpy, setFailedSpy } = await runCompareFileShaWithThrowingFs('plain string failure', true)

    expect(result).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('plain string failure'))
    expect(setFailedSpy).toHaveBeenCalledWith(expect.stringContaining('plain string failure'))
  })

  it('compareFileSha catch block does not call setFailed when failOnMismatch=false', async () => {
    const { result, errorSpy, setFailedSpy } = await runCompareFileShaWithThrowingFs(new Error('boom'), false)

    expect(result).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('boom'))
    expect(setFailedSpy).not.toHaveBeenCalled()
  })
})
