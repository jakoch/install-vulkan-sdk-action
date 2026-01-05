/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import { installLavapipe, getLatestVersion } from '../src/installer_lavapipe'
import * as tc from '@actions/tool-cache'
import * as versionsRasterizers from '../src/versions_rasterizers'
import * as http from '../src/http'
import * as core from '@actions/core' // Import @actions/core for mocking
import * as errors from '../src/errors'

jest.mock('@actions/tool-cache')
jest.mock('../src/versions_rasterizers')
jest.mock('../src/http')

describe('installer_lavapipe', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('installLavapipe', () => {
    it('should download and extract the lavapipe library', async () => {
      const mockDownloadUrl = 'https://example.com/lavapipe.zip'
      const mockArchivePath = '/path/to/archive.zip'
      const mockInstallPath = '/path/to/install'

      jest.spyOn(tc, 'downloadTool').mockResolvedValue(mockArchivePath)
      jest.spyOn(tc, 'extractZip').mockResolvedValue(mockInstallPath)
      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'lavapipe-win64': { version: '1.0.0', tag: 'v1.0.0', url: mockDownloadUrl },
          'swiftshader-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/swiftshader.zip' }
        }
      })
      jest.spyOn(http, 'isDownloadable').mockResolvedValue(undefined)

      const result = await installLavapipe(mockInstallPath)

      expect(tc.downloadTool).toHaveBeenCalledWith(mockDownloadUrl)
      expect(tc.extractZip).toHaveBeenCalledWith(mockArchivePath, mockInstallPath)
      expect(result).toBe(mockInstallPath)
    })

    it('should return cached path when useCache is true and cache is found', async () => {
      const mockDownloadUrl = 'https://example.com/lavapipe.zip'
      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'lavapipe-win64': { version: '1.2.3', tag: 'v1.2.3', url: mockDownloadUrl },
          'swiftshader-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/swiftshader.zip' }
        }
      })

      jest.spyOn(tc, 'find').mockReturnValue('/cached/lavapipe')

      const result = await installLavapipe('/some/dest', true)

      expect(tc.find).toHaveBeenCalledWith('lavapipe', '1.2.3')
      expect(result).toBe('/cached/lavapipe')
    })

    it('should cache the extracted directory when useCache is true', async () => {
      const mockDownloadUrl = 'https://example.com/lavapipe.zip'
      const mockArchivePath = '/path/to/archive.zip'
      const mockExtractedPath = '/path/to/extracted'
      const mockCachePath = '/path/to/cached'

      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'lavapipe-win64': { version: '2.0.0', tag: 'v2.0.0', url: mockDownloadUrl },
          'swiftshader-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/swiftshader.zip' }
        }
      })

      jest.spyOn(tc, 'find').mockReturnValue('')
      jest.spyOn(tc, 'downloadTool').mockResolvedValue(mockArchivePath)
      jest.spyOn(tc, 'extractZip').mockResolvedValue(mockExtractedPath)
      jest.spyOn(tc, 'cacheDir').mockResolvedValue(mockCachePath)
      jest.spyOn(http, 'isDownloadable').mockResolvedValue(undefined)

      const result = await installLavapipe('/dest', true)

      expect(tc.cacheDir).toHaveBeenCalledWith(mockExtractedPath, 'lavapipe', '2.0.0')
      expect(result).toBe(mockCachePath)
    })

    it('should call errors.handleError when isDownloadable throws', async () => {
      const mockDownloadUrl = 'https://example.com/lavapipe.zip'
      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'lavapipe-win64': { version: '3.0.0', tag: 'v3.0.0', url: mockDownloadUrl },
          'swiftshader-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/swiftshader.zip' }
        }
      })

      jest.spyOn(tc, 'find').mockReturnValue('')
      const err = new Error('not downloadable')
      const spyHandle = jest.spyOn(errors, 'handleError').mockImplementation(jest.fn())
      jest.spyOn(http, 'isDownloadable').mockRejectedValue(err)

      await expect(installLavapipe('/dest')).rejects.toThrow(err)
      expect(spyHandle).toHaveBeenCalled()
      spyHandle.mockRestore()
    })
  })

  describe('getLatestVersion', () => {
    it('should return the download url and version for the latest lavapipe', async () => {
      const mockDownloadUrl = 'https://example.com/lavapipe.zip'
      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'lavapipe-win64': { version: '1.0.0', tag: 'v1.0.0', url: mockDownloadUrl },
          'swiftshader-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/swiftshader.zip' }
        }
      })

      const result = await getLatestVersion()

      expect(result.url).toBe(mockDownloadUrl)
      expect(result.version).toBe('1.0.0')
    })

    it('should log an error when download URL or version is missing', async () => {
      jest.spyOn(versionsRasterizers, 'getLatestVersionsJson').mockResolvedValue({
        latest: {
          'lavapipe-win64': { version: '', tag: '', url: '' },
          'swiftshader-win64': { version: '1.0.0', tag: 'v1.0.0', url: 'https://example.com/swiftshader.zip' }
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
