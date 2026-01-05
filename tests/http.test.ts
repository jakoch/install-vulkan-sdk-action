/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as core from '@actions/core'
import * as httpm from '@actions/http-client'
import { isDownloadable, download } from '../src/http'

// Mock @actions/core
jest.mock('@actions/core')

describe('http', () => {
  let mockHead: jest.SpyInstance

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()

    // Mock the HttpClient head method
    mockHead = jest.spyOn(httpm.HttpClient.prototype, 'head').mockImplementation()
  })

  afterEach(() => {
    mockHead.mockRestore()
  })

  it('should handle successful download check', async () => {
    // Mock successful response
    mockHead.mockResolvedValue({
      message: {
        statusCode: 200
      }
    } as httpm.HttpClientResponse)

    await isDownloadable('test-package', '1.0.0', 'https://example.com/test')

    expect(mockHead).toHaveBeenCalledWith('https://example.com/test')
    expect(core.info).toHaveBeenCalledWith('✔️ Http(200): The requested test-package 1.0.0 is downloadable.')
  })

  it('should throw error for 404 status', async () => {
    // Mock 404 response
    mockHead.mockResolvedValue({
      message: {
        statusCode: 404
      }
    } as httpm.HttpClientResponse)

    await expect(isDownloadable('test-package', '1.0.0', 'https://example.com/test')).rejects.toThrow(
      '❌ Http(Error): The requested test-package 1.0.0 is not downloadable using URL: https://example.com/test.'
    )
  })

  it('should throw error for network failure', async () => {
    // Mock network error
    mockHead.mockRejectedValue(new Error('Network error'))

    await expect(isDownloadable('test-package', '1.0.0', 'https://example.com/test')).rejects.toThrow('Network error')
  })

  it('should handle undefined status code', async () => {
    // Mock response with undefined statusCode
    mockHead.mockResolvedValue({
      message: {
        statusCode: undefined
      }
    } as httpm.HttpClientResponse)

    await isDownloadable('test-package', '1.0.0', 'https://example.com/test')

    expect(mockHead).toHaveBeenCalledWith('https://example.com/test')
    // No core.info called since statusCode is undefined
    expect(core.info).not.toHaveBeenCalled()
  })

  it('should not throw for non-200/>=400 status like 301', async () => {
    mockHead.mockResolvedValue({
      message: {
        statusCode: 301
      }
    } as httpm.HttpClientResponse)

    await expect(isDownloadable('test-package', '1.0.0', 'https://example.com/redirect')).resolves.toBeUndefined()
    expect(mockHead).toHaveBeenCalledWith('https://example.com/redirect')
    expect(core.info).not.toHaveBeenCalled()
  })

  it('should swallow non-Error rejections from client.head', async () => {
    // Mock a rejection with a non-Error value (e.g., a string)
    mockHead.mockRejectedValue('string error')

    // The implementation catches non-Error and does not rethrow; function should resolve
    await expect(isDownloadable('test-package', '1.0.0', 'https://example.com/weird')).resolves.toBeUndefined()
  })
})

describe('http.download', () => {
  let spyGet: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    spyGet = jest.spyOn(httpm.HttpClient.prototype, 'get').mockImplementation()
  })

  afterEach(() => {
    spyGet.mockRestore()
  })

  it('returns body on 200', async () => {
    const fakeRes = {
      message: { statusCode: 200 },
      readBody: async () => 'response body'
    }
    spyGet.mockResolvedValue(fakeRes)
    const body = await download('https://example.com/foo')
    expect(body).toBe('response body')
    expect(spyGet).toHaveBeenCalledWith('https://example.com/foo')
  })

  it('throws on 404', async () => {
    const fakeRes = {
      message: { statusCode: 404 },
      readBody: async () => 'not found'
    }
    spyGet.mockResolvedValue(fakeRes)
    await expect(download('https://example.com/missing')).rejects.toThrow('Failed to download https://example.com/missing - HTTP status 404')
  })

  it('throws on client error', async () => {
    spyGet.mockRejectedValue(new Error('client failure'))
    await expect(download('https://example.com/error')).rejects.toThrow('client failure')
  })
})
