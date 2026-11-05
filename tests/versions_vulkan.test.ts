/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import {
  getAvailableVersions,
  getLatestVersions,
  getLatestVersionForPlatform,
  resolveVersion,
  getLowerVersion
} from '../src/versions_vulkan'
import * as core from '@actions/core'
import * as http from '../src/http'
import * as platform from '../src/platform'
import * as versions from '../src/versions'
import * as vulkanSdkArm from '../src/vulkan_sdk_arm'

jest.mock('../src/http')
jest.mock('../src/platform')
jest.mock('../src/versions')
jest.mock('../src/vulkan_sdk_arm')

describe('versions_vulkan', () => {
  describe('getAvailableVersions', () => {
    it('should return available versions for the current platform', async () => {
      const mockPlatform = 'linux'
      const mockVersions = ['1.4.304.0', '1.3.296.0']
      ;(platform.getPlatform as jest.Mock).mockReturnValue(mockPlatform)
      ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: mockVersions })

      const result = await getAvailableVersions()
      expect(result).toEqual({ versions: mockVersions })
    })

    it('should throw an error if unable to retrieve versions', async () => {
      const mockPlatform = 'linux'
      ;(jest.spyOn(platform, 'getPlatform') as jest.Mock).mockResolvedValue(mockPlatform)
      ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: null })

      await expect(getAvailableVersions()).rejects.toThrow(
        'Unable to retrieve the list of all available VULKAN SDK versions from'
      )
    })
  })

  describe('getLatestVersions', () => {
    it('should return the latest versions for each platform', async () => {
      const mockLatestVersions = {
        linux: '1.4.304.0',
        mac: '1.4.304.0',
        warm: '1.4.304.0',
        windows: '1.4.304.0'
      }
      ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: mockLatestVersions })

      const result = await getLatestVersions()
      expect(result).toEqual(mockLatestVersions)
    })

    it('should throw an error if unable to retrieve latest versions', async () => {
      ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: null })

      await expect(getLatestVersions()).rejects.toThrow('Unable to retrieve the latest version information from')
    })
  })

  describe('getLatestVersionForPlatform', () => {
    const mockLatestVersions = {
      linux: '1.4.304.0',
      mac: '1.4.304.0',
      warm: '1.4.304.0',
      windows: '1.4.304.0'
    }

    it('should return the latest version for Windows', () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: true }) // Mock IS_WINDOWS to true
      Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false }) // Mock IS_WINDOWS_ARM to false
      Object.defineProperty(platform, 'IS_LINUX', { value: false }) // Mock IS_LINUX to false
      Object.defineProperty(platform, 'IS_MAC', { value: false }) // Mock IS_MAC to false

      const result = getLatestVersionForPlatform(mockLatestVersions)
      expect(result).toBe('1.4.304.0') // Should return the windows version
    })

    it('should return the latest version for Windows ARM', () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: false }) // Mock IS_WINDOWS to false
      Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: true }) // Mock IS_WINDOWS_ARM to true
      Object.defineProperty(platform, 'IS_LINUX', { value: false }) // Mock IS_LINUX to false
      Object.defineProperty(platform, 'IS_MAC', { value: false }) // Mock IS_MAC to false

      const result = getLatestVersionForPlatform(mockLatestVersions)
      expect(result).toBe('1.4.304.0') // Should return the warm (Windows ARM) version
    })

    it('should return the latest version for Linux', () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: false }) // Mock IS_WINDOWS to false
      Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false }) // Mock IS_WINDOWS_ARM to false
      Object.defineProperty(platform, 'IS_LINUX', { value: true }) // Mock IS_LINUX to true
      Object.defineProperty(platform, 'IS_LINUX_ARM', { value: false }) // Mock IS_LINUX_ARM to false
      Object.defineProperty(platform, 'IS_MAC', { value: false }) // Mock IS_MAC to false

      const result = getLatestVersionForPlatform(mockLatestVersions)
      expect(result).toBe('1.4.304.0') // Should return the linux version
    })

    it('should return the latest version for Linux ARM', () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: false }) // Mock IS_WINDOWS to false
      Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false }) // Mock IS_WINDOWS_ARM to false
      Object.defineProperty(platform, 'IS_LINUX', { value: false }) // Mock IS_LINUX to false
      Object.defineProperty(platform, 'IS_LINUX_ARM', { value: true }) // Mock IS_LINUX_ARM to true
      Object.defineProperty(platform, 'IS_MAC', { value: false }) // Mock IS_MAC to false

      const result = getLatestVersionForPlatform(mockLatestVersions)
      expect(result).toBe('1.4.304.0') // Should return the linux version, same as IS_LINUX
    })

    it('should return the latest version for macOS', () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: false }) // Mock IS_WINDOWS to false
      Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false }) // Mock IS_WINDOWS_ARM to false
      Object.defineProperty(platform, 'IS_LINUX', { value: false }) // Mock IS_LINUX to false
      Object.defineProperty(platform, 'IS_LINUX_ARM', { value: false }) // Mock IS_LINUX_ARM to false
      Object.defineProperty(platform, 'IS_MAC', { value: true }) // Mock IS_MAC to true

      const result = getLatestVersionForPlatform(mockLatestVersions)
      expect(result).toBe('1.4.304.0') // Should return the mac version
    })

    it('should return an empty string for unknown platform', () => {
      // All platform flags are false, so it should return an empty string
      Object.defineProperty(platform, 'IS_WINDOWS', { value: false })
      Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false })
      Object.defineProperty(platform, 'IS_LINUX', { value: false })
      Object.defineProperty(platform, 'IS_LINUX_ARM', { value: false })
      Object.defineProperty(platform, 'IS_MAC', { value: false })

      const result = getLatestVersionForPlatform(mockLatestVersions)
      expect(result).toBe('') // Should return empty string
    })
  })

  describe('resolveVersion', () => {
    beforeEach(() => {
      Object.defineProperty(platform, 'IS_LINUX_ARM', { value: false })
      ;(vulkanSdkArm.getLatestArmRelease as jest.Mock).mockResolvedValue(null)
    })

    it('should resolve "latest" to the latest available ARM release on Linux ARM', async () => {
      Object.defineProperty(platform, 'IS_LINUX_ARM', { value: true })
      ;(vulkanSdkArm.getLatestArmRelease as jest.Mock).mockResolvedValue({
        version: '1.4.363.0',
        distribution: '24.04'
      })

      const result = await resolveVersion('latest')

      expect(result).toBe('1.4.363.0')
      expect(vulkanSdkArm.getLatestArmRelease).toHaveBeenCalled()
      expect(http.client.getJson).not.toHaveBeenCalled()
    })

    it('should fall back to the LunarG latest version if no ARM release is available', async () => {
      const mockLatestVersions = {
        linux: '1.4.363.1',
        mac: '1.4.363.1',
        warm: '1.4.363.1',
        windows: '1.4.363.1'
      }
      Object.defineProperty(platform, 'IS_WINDOWS', { value: false })
      Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false })
      Object.defineProperty(platform, 'IS_LINUX', { value: true })
      Object.defineProperty(platform, 'IS_LINUX_ARM', { value: true })
      Object.defineProperty(platform, 'IS_MAC', { value: false })
      ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: mockLatestVersions })

      const result = await resolveVersion('latest')

      expect(result).toBe('1.4.363.1')
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("Falling back to LunarG's latest version"))
    })

    it('should fall back to the LunarG latest version if the ARM release lookup fails', async () => {
      const mockLatestVersions = {
        linux: '1.4.363.1',
        mac: '1.4.363.1',
        warm: '1.4.363.1',
        windows: '1.4.363.1'
      }
      Object.defineProperty(platform, 'IS_WINDOWS', { value: false })
      Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false })
      Object.defineProperty(platform, 'IS_LINUX', { value: true })
      Object.defineProperty(platform, 'IS_LINUX_ARM', { value: true })
      Object.defineProperty(platform, 'IS_MAC', { value: false })
      ;(vulkanSdkArm.getLatestArmRelease as jest.Mock).mockRejectedValue(new Error('API unavailable'))
      ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: mockLatestVersions })

      const result = await resolveVersion('latest')

      expect(result).toBe('1.4.363.1')
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Could not determine the latest Vulkan SDK ARM release: API unavailable')
      )
    })

    it('should resolve "latest" to the latest version for the platform', async () => {
      const mockLatestVersions = {
        linux: '1.4.304.0',
        mac: '1.4.304.0',
        warm: '1.4.304.0',
        windows: '1.4.304.0'
      }
      Object.defineProperty(platform, 'IS_LINUX', { value: true })
      ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: mockLatestVersions })

      const result = await resolveVersion('latest')
      expect(result).toBe('1.4.304.0')
    })

    it('should call core.info when latest version is resolved', async () => {
      const mockLatestVersions = {
        linux: '1.4.304.0',
        mac: '1.4.304.0',
        warm: '1.4.304.0',
        windows: '1.4.304.0'
      }
      Object.defineProperty(platform, 'IS_LINUX', { value: true })
      ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: mockLatestVersions })

      const infoSpy = jest.spyOn(core, 'info').mockImplementation(() => undefined)
      const result = await resolveVersion('latest')
      expect(result).toBe('1.4.304.0')
      expect(infoSpy).toHaveBeenCalledWith('Latest Version: 1.4.304.0')
      infoSpy.mockRestore()
    })

    it('should return the passed version if it is not "latest"', async () => {
      const result = await resolveVersion('1.3.296.0')
      expect(result).toBe('1.3.296.0')
    })

    it('should handle errors during version resolution', async () => {
      ;(http.client.getJson as jest.Mock).mockRejectedValue(new Error('Network error'))
      jest.spyOn(core, 'setFailed').mockImplementation(jest.fn())

      const result = await resolveVersion('latest')
      expect(result).toBe('latest')
      expect(core.setFailed).toHaveBeenCalledWith('Network error')
    })
  })

  describe('getLowerVersion', () => {
    it('should return the next lower version', async () => {
      const mockVersions = ['1.4.304.0', '1.3.296.0', '1.3.290.0']
      jest.spyOn(versions, 'compare').mockImplementation((a: string, b: string) => a.localeCompare(b))

      const result = await getLowerVersion('1.4.304.0', mockVersions)
      expect(result).toBe('1.3.296.0')
    })

    it('should return the same version if it is the lowest', async () => {
      const mockVersions = ['1.4.304.0', '1.3.296.0', '1.3.290.0']
      jest.spyOn(versions, 'compare').mockImplementation((a, b) => a.localeCompare(b))

      const result = await getLowerVersion('1.3.290.0', mockVersions)
      expect(result).toBe('1.3.290.0')
    })

    it('should throw an error if versions list is empty', async () => {
      await expect(getLowerVersion('1.4.304.0', [])).rejects.toThrow('versions list is empty')
    })

    it('should return the given version if it is not found in the sorted versions list', async () => {
      const mockVersions = ['1.4.304.0', '1.3.296.0', '1.3.290.0']
      jest.spyOn(versions, 'compare').mockImplementation((a, b) => a.localeCompare(b))

      const result = await getLowerVersion('1.2.0.0', mockVersions) // version not in list
      expect(result).toBe('1.2.0.0') // Should return the version itself, as it's not in the list
    })
  })
})
