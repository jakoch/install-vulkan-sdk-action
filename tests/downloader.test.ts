import {
  getUrlVulkanSdk,
  getUrlVulkanRuntime,
  downloadVulkanSdk,
  downloadVulkanRuntime,
  getVulkanSdkFilename
} from '../src/downloader'
import * as platform from '../src/platform'
import * as versionsVulkan from '../src/versions_vulkan'
import * as http from '../src/http'
import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'

jest.mock('../src/platform')
jest.mock('../src/versions_vulkan')
jest.mock('../src/http', () => ({
  isDownloadable: jest.fn() as jest.Mock
}))
jest.mock('@actions/tool-cache')
jest.mock('@actions/core')

describe('downloader', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
    jest.spyOn(platform, 'getPlatform').mockReturnValue('')
    Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_LINUX', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_LINUX_ARM', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_MAC', { value: false, configurable: true })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('downloadVulkanSdk', () => {
    it('should download the Vulkan SDK and return the path', async () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
      const version = '1.3.250.1'
      const url = `https://sdk.lunarg.com/sdk/download/${version}/windows/VulkanSDK-${version}-Installer.exe`
      const expectedPath = `/tmp/VulkanSDK-Installer.exe`

      jest.spyOn(require('../src/downloader'), 'getUrlVulkanRuntime').mockResolvedValue(url)
      ;(tc.downloadTool as jest.Mock).mockResolvedValueOnce(expectedPath)

      const sdkPath = await downloadVulkanSdk(version)
      expect(sdkPath).toBe(expectedPath)
    })
  })

  describe('downloadVulkanRuntime', () => {
    it('should download the Vulkan Runtime and return the path', async () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
      const version = '1.3.250.1'
      const url = `https://sdk.lunarg.com/sdk/download/${version}/windows/vulkan-runtime-components.zip`
      const expectedPath = `/tmp/vulkan-runtime-components.zip`

      jest.spyOn(require('../src/downloader'), 'getUrlVulkanRuntime').mockResolvedValue(url)
      ;(tc.downloadTool as jest.Mock).mockResolvedValue(expectedPath)

      const runtimePath = await downloadVulkanRuntime(version)
      expect(runtimePath).toBe(expectedPath)
    })
  })

  describe('getUrlVulkanSdk', () => {
    it('should return the correct URL for Windows', async () => {
      ;(platform.getPlatform as jest.Mock).mockReturnValue('windows')
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)
      Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })

      const version = '1.3.250.1'
      const expectedUrl = `https://sdk.lunarg.com/sdk/download/${version}/windows/VulkanSDK-${version}-Installer.exe`
      const url = await getUrlVulkanSdk(version)
      expect(url).toBe(expectedUrl)

      const version2 = '1.4.313.0'
      const expectedUrl2 = `https://sdk.lunarg.com/sdk/download/${version2}/windows/vulkansdk-windows-X64-${version2}.exe`
      const url2 = await getUrlVulkanSdk(version2)
      expect(url2).toBe(expectedUrl2)
    })

    it('should return the correct URL for Windows ARM', async () => {
      ;(platform.getPlatform as jest.Mock).mockReturnValue('windows')
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)
      Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: true, configurable: true })

      const version = '1.3.290.0' // 1.3.290.0 23-07-2024 is first release for Windows ARM
      const expectedUrl = `https://sdk.lunarg.com/sdk/download/${version}/windows/InstallVulkanARM64-${version}.exe`
      const url = await getUrlVulkanSdk(version)
      expect(url).toBe(expectedUrl)

      const version2 = '1.4.313.0' // 1.4.313.0 06-05-2025 filename changed
      const expectedUrl2 = `https://sdk.lunarg.com/sdk/download/${version2}/windows/vulkansdk-windows-ARM64-${version2}.exe`
      const url2 = await getUrlVulkanSdk(version2)
      expect(url2).toBe(expectedUrl2)
    })

    it('should return the correct URL for Linux', async () => {
      ;(platform.getPlatform as jest.Mock).mockReturnValue('linux')
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)

      Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
      Object.defineProperty(platform, 'IS_LINUX', { value: true, configurable: true })

      const version = '1.3.250.1'
      const expectedUrl = `https://sdk.lunarg.com/sdk/download/${version}/linux/vulkansdk-linux-x86_64-${version}.tar.gz`

      const url = await getUrlVulkanSdk(version)
      expect(url).toBe(expectedUrl)
    })

    it('should return the correct URL for Mac', async () => {
      ;(platform.getPlatform as jest.Mock).mockReturnValue('mac')
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)

      Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
      Object.defineProperty(platform, 'IS_MAC', { value: true, configurable: true })

      const version = '1.3.290.0'
      const expectedUrl = `https://sdk.lunarg.com/sdk/download/${version}/mac/vulkansdk-macos-${version}.dmg`

      const url = await getUrlVulkanSdk(version)
      expect(url).toBe(expectedUrl)
    })

    it('should return the correct URL for Linux ARM', async () => {
      ;(platform.getPlatform as jest.Mock).mockReturnValue('linux')
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)
      ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('24.04')

      Object.defineProperty(platform, 'IS_LINUX_ARM', { value: true, configurable: true })

      const version = '1.4.304.0'
      const expectedUrl = `https://github.com/jakoch/vulkan-sdk-arm/releases/download/${version}/vulkansdk-ubuntu-24.04-arm-${version}.tar.xz`

      const url = await getUrlVulkanSdk(version)
      expect(url).toBe(expectedUrl)
    })

    it('should return the correct URL for Linux ARM with 22.04', async () => {
      ;(platform.getPlatform as jest.Mock).mockReturnValue('linux')
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)
      ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('22.04')

      Object.defineProperty(platform, 'IS_LINUX_ARM', { value: true, configurable: true })

      const version = '1.4.304.0'
      const expectedUrl = `https://github.com/jakoch/vulkan-sdk-arm/releases/download/${version}/vulkansdk-ubuntu-22.04-arm-${version}.tar.xz`

      const url = await getUrlVulkanSdk(version)
      expect(url).toBe(expectedUrl)
    })

    it('should return the correct URL for Linux with tar.xz', async () => {
      ;(platform.getPlatform as jest.Mock).mockReturnValue('linux')
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)

      Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
      Object.defineProperty(platform, 'IS_LINUX', { value: true, configurable: true })

      const version = '1.3.250.2'
      const expectedUrl = `https://sdk.lunarg.com/sdk/download/${version}/linux/vulkansdk-linux-x86_64-${version}.tar.xz`

      const url = await getUrlVulkanSdk(version)
      expect(url).toBe(expectedUrl)
    })

    it('should return the correct URL for Mac with zip', async () => {
      ;(platform.getPlatform as jest.Mock).mockReturnValue('mac')
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)

      Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
      Object.defineProperty(platform, 'IS_MAC', { value: true, configurable: true })

      const version = '1.3.290.1'
      const expectedUrl = `https://sdk.lunarg.com/sdk/download/${version}/mac/vulkansdk-macos-${version}.zip`

      const url = await getUrlVulkanSdk(version)
      expect(url).toBe(expectedUrl)
    })
  })
  describe('getUrlVulkanRuntime', () => {
    beforeEach(() => {
      jest.restoreAllMocks()
      jest.clearAllMocks()
    })

    it('should return the correct URL for Vulkan Runtime Windows when downloadable', async () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
      ;(platform.getPlatform as jest.Mock).mockReturnValue('windows')
      const version = '1.3.250.1'
      const expectedUrl = `https://sdk.lunarg.com/sdk/download/${version}/windows/vulkan-runtime-components.zip`
      ;(versionsVulkan.getAvailableVersions as jest.Mock).mockResolvedValue({ versions: [version] })
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)

      const url = await getUrlVulkanRuntime(version)
      expect(url).toBe(expectedUrl)
    })

    it('should return the correct URL for Vulkan Runtime ARM when downloadable', async () => {
      Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: true, configurable: true })
      ;(platform.getPlatform as jest.Mock).mockReturnValue('warm')
      const version = '1.4.309.0'
      const expectedUrl = `https://sdk.lunarg.com/sdk/download/${version}/warm/vulkan-runtime-components.zip`
      ;(versionsVulkan.getAvailableVersions as jest.Mock).mockResolvedValue({ versions: [version] })
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)

      const url = await getUrlVulkanRuntime(version)
      expect(url).toBe(expectedUrl)
    })

    it('should throw an error if available versions cannot be retrieved', async () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
      ;(platform.getPlatform as jest.Mock).mockReturnValue('windows')
      const version = '1.0'
      ;(versionsVulkan.getAvailableVersions as jest.Mock).mockResolvedValue(null)

      await expect(getUrlVulkanRuntime(version)).rejects.toThrow('No available versions found')
    })

    it('should try lower versions if the current version is not downloadable', async () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
      ;(platform.getPlatform as jest.Mock).mockReturnValue('windows')
      const version = '1.3.239.0'
      const lowerVersion = '1.3.236.0'
      const expectedUrl = `https://sdk.lunarg.com/sdk/download/${lowerVersion}/windows/vulkan-runtime-components.zip`
      ;(versionsVulkan.getAvailableVersions as jest.Mock).mockResolvedValue({ versions: [version, lowerVersion] })
      ;(http.isDownloadable as jest.Mock).mockRejectedValueOnce(new Error('Not downloadable'))
      ;(http.isDownloadable as jest.Mock).mockResolvedValue(true)
      ;(versionsVulkan.getLowerVersion as jest.Mock).mockResolvedValue(lowerVersion)

      const url = await getUrlVulkanRuntime(version)
      expect(url).toBe(expectedUrl)
    })

    it('should log when no lower version is available and then throw', async () => {
      const version = '1.3.236.0'

      Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
      ;(platform.getPlatform as jest.Mock).mockReturnValue('windows')
      ;(versionsVulkan.getAvailableVersions as jest.Mock).mockResolvedValue({ versions: [version] })
      ;(versionsVulkan.getLowerVersion as jest.Mock).mockResolvedValue(version) // same version = triggers log
      ;(http.isDownloadable as jest.Mock).mockRejectedValue(new Error('Not downloadable')) // always fails

      const coreInfoSpy = jest.spyOn(core, 'info').mockImplementation(jest.fn()) // suppress logs

      await expect(getUrlVulkanRuntime(version)).rejects.toThrow(
        'Failed to find a downloadable Vulkan runtime version after 3 attempts.'
      )
      expect(coreInfoSpy).toHaveBeenCalledWith(`No lower version available for Vulkan runtime version ${version}.`)
    })
  })
  describe('getVulkanSdkFilename', () => {
    it('should return the correct filename for Windows', () => {
      Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
      const version = '1.3.236.0'
      const expectedFilename = 'VulkanSDK-Installer.exe'

      const filename = getVulkanSdkFilename(version)
      expect(filename).toBe(expectedFilename)
    })

    it('should return the correct filename for Linux, for versions up to 1.3.250.1 the ending is ".tar.gz"', () => {
      Object.defineProperty(platform, 'IS_LINUX', { value: true, configurable: true })
      const version = '1.3.249.9'
      const expectedFilename = 'vulkansdk-linux-x86_64.tar.gz'

      const filename = getVulkanSdkFilename(version)
      expect(filename).toBe(expectedFilename)
    })

    it('should return the correct filename for Linux, for versions after 1.3.250.1 the ending is ".tar.xz"', () => {
      Object.defineProperty(platform, 'IS_LINUX', { value: true, configurable: true })
      const version = '2.3.250.1'
      const expectedFilename = 'vulkansdk-linux-x86_64.tar.xz'

      const filename = getVulkanSdkFilename(version)
      expect(filename).toBe(expectedFilename)
    })

    it('should return the correct filename for Mac, for versions up to 1.3.290.0 the ending is ".dmg"', () => {
      Object.defineProperty(platform, 'IS_MAC', { value: true, configurable: true })
      const version = '1.3.290.0'
      const expectedFilename = 'vulkansdk-macos.dmg'

      const filename = getVulkanSdkFilename(version)
      expect(filename).toBe(expectedFilename)
    })

    it('should return the correct filename for Mac, for versions after 1.3.290.0 the ending is ".zip"', () => {
      Object.defineProperty(platform, 'IS_MAC', { value: true, configurable: true })
      const version = '1.3.290.1'
      const expectedFilename = 'vulkansdk-macos.zip'

      const filename = getVulkanSdkFilename(version)
      expect(filename).toBe(expectedFilename)
    })
  })
})
