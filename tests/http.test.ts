/*---------------------------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2025 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *--------------------------------------------------------------------------------------------*/

import * as core from '@actions/core'
import * as httpm from '@actions/http-client'
import { isDownloadable } from '../src/http'

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
})
