/*---------------------------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *--------------------------------------------------------------------------------------------*/

import { installSwiftShader, getLatestVersion } from '../src/installer_swiftshader'
import * as tc from '@actions/tool-cache'
import * as versionsRasterizers from '../src/versions_rasterizers'
import * as http from '../src/http'
import * as core from '@actions/core' // Import @actions/core for mocking
import * as errors from '../src/errors'

jest.mock('@actions/tool-cache')
jest.mock('../src/versions_rasterizers')
jest.mock('../src/http')

describe('installer_swiftshader', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('installSwiftShader', () => {
    it('should download and extract the SwiftShader library', async () => {
      const mockDownloadUrl = 'https://example.com/swiftshader.zip'
      const mockArchivePath = '/path/to/archive.zip'
      const mockInstallPath = '/path/to/install'

      jest.spyOn(tc, 'downloadTool').mockResolvedValue(mockArchivePath)
      jest.spyOn(tc, 'extractZip').mockResolvedValue(mockInstallPath)
      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'swiftshader-win64': { version: '1.0.0', tag: 'v1.0.0', url: mockDownloadUrl },
          'lavapipe-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/lavapipe.zip' }
        }
      })
      jest.spyOn(http, 'isDownloadable').mockResolvedValue(undefined)

      const result = await installSwiftShader(mockInstallPath, false)

      expect(tc.downloadTool).toHaveBeenCalledWith(mockDownloadUrl)
      expect(tc.extractZip).toHaveBeenCalledWith(mockArchivePath, mockInstallPath)
      expect(result).toBe(mockInstallPath)
    })

    it('should return cached path when useCache is true and cache is found', async () => {
      const mockDownloadUrl = 'https://example.com/swiftshader.zip'
      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'swiftshader-win64': { version: '4.4.4', tag: 'v4.4.4', url: mockDownloadUrl },
          'lavapipe-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/lavapipe.zip' }
        }
      })

      jest.spyOn(tc, 'find').mockReturnValue('/cached/swiftshader')

      const result = await installSwiftShader('/dest', true)

      expect(tc.find).toHaveBeenCalledWith('swiftshader', '4.4.4')
      expect(result).toBe('/cached/swiftshader')
    })

    it('should cache the extracted directory when useCache is true', async () => {
      const mockDownloadUrl = 'https://example.com/swiftshader.zip'
      const mockArchivePath = '/path/to/archive.zip'
      const mockExtractedPath = '/path/to/extracted'
      const mockCachePath = '/path/to/cached'

      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'swiftshader-win64': { version: '5.5.5', tag: 'v5.5.5', url: mockDownloadUrl },
          'lavapipe-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/lavapipe.zip' }
        }
      })

      jest.spyOn(tc, 'find').mockReturnValue('')
      jest.spyOn(tc, 'downloadTool').mockResolvedValue(mockArchivePath)
      jest.spyOn(tc, 'extractZip').mockResolvedValue(mockExtractedPath)
      jest.spyOn(tc, 'cacheDir').mockResolvedValue(mockCachePath)
      jest.spyOn(http, 'isDownloadable').mockResolvedValue(undefined)

      const result = await installSwiftShader('/dest', true)

      expect(tc.cacheDir).toHaveBeenCalledWith(mockExtractedPath, 'swiftshader', '5.5.5')
      expect(result).toBe(mockCachePath)
    })

    it('should call errors.handleError when isDownloadable throws', async () => {
      const mockDownloadUrl = 'https://example.com/swiftshader.zip'
      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'swiftshader-win64': { version: '6.6.6', tag: 'v6.6.6', url: mockDownloadUrl },
          'lavapipe-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/lavapipe.zip' }
        }
      })

      jest.spyOn(tc, 'find').mockReturnValue('')
      const err = new Error('not downloadable')
      const spyHandle = jest.spyOn(errors, 'handleError').mockImplementation(jest.fn())
      jest.spyOn(http, 'isDownloadable').mockRejectedValue(err)

      await expect(installSwiftShader('/dest', false)).rejects.toThrow(err)
      expect(spyHandle).toHaveBeenCalled()
      spyHandle.mockRestore()
    })
  })

  describe('getLatestVersion', () => {
    it('should return the download URL and version for the latest SwiftShader library', async () => {
      const mockDownloadUrl = 'https://example.com/swiftshader.zip'
      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'swiftshader-win64': { version: '1.0.0', tag: 'v1.0.0', url: mockDownloadUrl },
          'lavapipe-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/lavapipe.zip' }
        }
      })

      const result = await getLatestVersion()

      expect(result.url).toBe(mockDownloadUrl)
      expect(result.version).toBe('1.0.0')
    })

    it('should log an error when download URL or version is missing', async () => {
      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'swiftshader-win64': { version: '', tag: '', url: '' }, // Simulate missing info
          'lavapipe-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/lavapipe.zip' }
        }
      })

      const spyError = jest.spyOn(core, 'error').mockImplementation(jest.fn())

      const result = await getLatestVersion()

      expect(spyError).toHaveBeenCalled()
      expect(result.url).toBe('')
      expect(result.version).toBe('')
      spyError.mockRestore()
    })
  })
})
