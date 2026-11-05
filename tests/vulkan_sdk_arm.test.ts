/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as github from '../src/github'
import * as platform from '../src/platform'
import {
  ARM_REPO_NAME,
  ARM_REPO_OWNER,
  getArmAssetName,
  getArmDownloadUrl,
  getLatestArmRelease,
  getLinuxArmDistribution
} from '../src/vulkan_sdk_arm'

jest.mock('../src/github')
jest.mock('../src/platform')

function createRelease(
  tagName: string,
  assetNames: string[],
  extra: Partial<github.GithubRelease> = {}
): github.GithubRelease {
  return {
    // biome-ignore lint: style/useNamingConvention
    tag_name: tagName,
    // biome-ignore lint: style/useNamingConvention
    assets_url: '',
    // biome-ignore lint: style/useNamingConvention
    upload_url: '',
    assets: assetNames.map(name => ({
      name,
      url: '',
      // biome-ignore lint: style/useNamingConvention
      browser_download_url: `https://example.com/${name}`
    })),
    ...extra
  }
}

describe('vulkan_sdk_arm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('24.04')
  })

  describe('getLinuxArmDistribution', () => {
    it('should use the exact 26.04 distribution', () => {
      ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('26.04')
      expect(getLinuxArmDistribution()).toBe('26.04')
    })

    it('should use 24.04 for 24.04', () => {
      ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('24.04')
      expect(getLinuxArmDistribution()).toBe('24.04')
    })

    it('should use 22.04 for 22.04', () => {
      ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('22.04')
      expect(getLinuxArmDistribution()).toBe('22.04')
    })

    it('should default to 24.04 for unknown distributions', () => {
      ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('')
      expect(getLinuxArmDistribution()).toBe('24.04')

      ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('25.10')
      expect(getLinuxArmDistribution()).toBe('24.04')
    })
  })

  describe('asset names and URLs', () => {
    it('should create the expected asset name', () => {
      expect(getArmAssetName('1.4.363.0', '24.04')).toBe('vulkansdk-ubuntu-24.04-arm-1.4.363.0.tar.xz')
    })

    it('should create the expected download URL', () => {
      expect(getArmDownloadUrl('1.4.363.0', '26.04')).toBe(
        `https://github.com/${ARM_REPO_OWNER}/${ARM_REPO_NAME}/releases/download/1.4.363.0/` +
          'vulkansdk-ubuntu-26.04-arm-1.4.363.0.tar.xz'
      )
    })
  })

  describe('getLatestArmRelease', () => {
    it('should query the vulkan-sdk-arm releases', async () => {
      ;(github.getReleases as jest.Mock).mockResolvedValue([
        createRelease('1.4.363.0', [getArmAssetName('1.4.363.0', '24.04')])
      ])

      await getLatestArmRelease()

      expect(github.getReleases).toHaveBeenCalledWith(ARM_REPO_OWNER, ARM_REPO_NAME)
    })

    it('should ignore draft and prerelease entries', async () => {
      ;(github.getReleases as jest.Mock).mockResolvedValue([
        createRelease('1.4.400.0', [getArmAssetName('1.4.400.0', '24.04')], { draft: true }),
        createRelease('1.4.500.0', [getArmAssetName('1.4.500.0', '24.04')], { prerelease: true }),
        createRelease('1.4.363.0', [getArmAssetName('1.4.363.0', '24.04')])
      ])

      await expect(getLatestArmRelease()).resolves.toEqual({ version: '1.4.363.0', distribution: '24.04' })
    })

    it('should return the newest release and its exact distribution', async () => {
      ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('26.04')
      ;(github.getReleases as jest.Mock).mockResolvedValue([
        createRelease('1.4.357.1', [getArmAssetName('1.4.357.1', '26.04')]),
        createRelease('1.4.363.0', [getArmAssetName('1.4.363.0', '26.04')])
      ])

      await expect(getLatestArmRelease()).resolves.toEqual({ version: '1.4.363.0', distribution: '26.04' })
    })

    it('should fall back to an older version built for the same distribution', async () => {
      ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('26.04')
      ;(github.getReleases as jest.Mock).mockResolvedValue([
        // Newer release has no 26.04 asset and must not be used.
        createRelease('1.4.400.0', [getArmAssetName('1.4.400.0', '24.04')]),
        createRelease('1.4.363.0', [getArmAssetName('1.4.363.0', '26.04')])
      ])

      await expect(getLatestArmRelease()).resolves.toEqual({ version: '1.4.363.0', distribution: '26.04' })
    })

    it('should return null when no release has an asset for the detected distribution', async () => {
      ;(platform.getLinuxDistributionVersionId as jest.Mock).mockReturnValue('26.04')
      ;(github.getReleases as jest.Mock).mockResolvedValue([
        createRelease('1.4.363.0', [getArmAssetName('1.4.363.0', '24.04')])
      ])

      await expect(getLatestArmRelease()).resolves.toBeNull()
    })

    it('should return null when there is no usable release', async () => {
      ;(github.getReleases as jest.Mock).mockResolvedValue([])

      await expect(getLatestArmRelease()).resolves.toBeNull()
    })
  })
})
