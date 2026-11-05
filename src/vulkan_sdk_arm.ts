/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as github from './github'
import * as platform from './platform'
import * as versions from './versions'

/**
 * Repository that publishes Vulkan SDK builds for Linux ARM64.
 */
export const ARM_REPO_OWNER = 'jakoch'
export const ARM_REPO_NAME = 'vulkan-sdk-arm'

/**
 * Interface describing a vulkan-sdk-arm release and the Ubuntu distribution of
 * the asset that can be used on this machine.
 */
export interface ArmSdkRelease {
  version: string
  distribution: string
}

interface ArmReleaseWithAsset {
  release: github.GithubRelease
  distribution: string
}

/**
 * Get the Ubuntu distributions whose assets can be used on this machine,
 * most preferred first.
 *
 * Newer Ubuntu releases can run binaries built for the previous LTS, so an
 * exact match is preferred and the previous LTS is used as a fallback.
 */
export function getLinuxArmDistributionPreference(): string[] {
  const detectedDistribution = platform.getLinuxDistributionVersionId()

  if (detectedDistribution === '26.04') {
    return ['26.04', '24.04']
  }
  if (detectedDistribution === '24.04') {
    return ['24.04']
  }
  if (detectedDistribution === '22.04') {
    return ['22.04']
  }

  // vulkan-sdk-arm currently publishes Ubuntu 24.04 and 26.04 assets.
  // Keep 24.04 as the default for unknown distributions.
  return ['24.04']
}

/**
 * Get the release asset name for a Vulkan SDK ARM build.
 */
export function getArmAssetName(version: string, distribution: string): string {
  return `vulkansdk-ubuntu-${distribution}-arm-${version}.tar.xz`
}

/**
 * Get the download URL for a Vulkan SDK ARM release asset.
 */
export function getArmDownloadUrl(version: string, distribution: string): string {
  return `https://github.com/${ARM_REPO_OWNER}/${ARM_REPO_NAME}/releases/download/${version}/${getArmAssetName(version, distribution)}`
}

function releaseHasAsset(release: github.GithubRelease, distribution: string): boolean {
  const assetName = getArmAssetName(release.tag_name, distribution)
  return release.assets.some(asset => asset.name === assetName)
}

/**
 * Get published vulkan-sdk-arm releases which contain an asset usable on this
 * machine, newest version first.
 */
async function getArmReleasesWithAsset(): Promise<ArmReleaseWithAsset[]> {
  const releases = await github.getReleases(ARM_REPO_OWNER, ARM_REPO_NAME)
  const preferences = getLinuxArmDistributionPreference()

  return releases
    .filter(release => !release.draft && !release.prerelease)
    .map(release => ({
      release,
      distribution: preferences.find(distribution => releaseHasAsset(release, distribution))
    }))
    .filter((entry): entry is ArmReleaseWithAsset => entry.distribution !== undefined)
    .sort((a, b) => versions.compare(b.release.tag_name, a.release.tag_name))
}

/**
 * Find the newest vulkan-sdk-arm release which can be installed on this
 * machine.
 *
 * The returned distribution may differ from the locally detected one when a
 * fallback asset is required.
 */
export async function getLatestArmRelease(): Promise<ArmSdkRelease | null> {
  const [latest] = await getArmReleasesWithAsset()
  if (!latest) {
    return null
  }
  return { version: latest.release.tag_name, distribution: latest.distribution }
}
