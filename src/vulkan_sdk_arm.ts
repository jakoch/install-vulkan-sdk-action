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

/**
 * Get the Ubuntu distribution used to select Vulkan SDK ARM builds.
 *
 * Only assets built for this distribution are considered. There is no
 * cross-distro fallback: if the newest SDK version has no asset for this
 * distribution, a lower SDK version built for the same distribution is used.
 *
 * For Ubuntu versions without a dedicated build, 24.04 is used as the
 * compatibility baseline.
 */
export function getLinuxArmDistribution(): string {
  const detectedDistribution = platform.getLinuxDistributionVersionId()

  if (detectedDistribution === '26.04') {
    return '26.04'
  }
  if (detectedDistribution === '24.04') {
    return '24.04'
  }
  if (detectedDistribution === '22.04') {
    return '22.04'
  }

  // vulkan-sdk-arm currently publishes Ubuntu 24.04 and 26.04 assets.
  // Keep 24.04 as the default for unknown distributions.
  return '24.04'
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
 * Get published vulkan-sdk-arm releases which contain an asset for the given
 * distribution, newest version first.
 */
async function getArmReleasesForDistribution(distribution: string): Promise<github.GithubRelease[]> {
  const releases = await github.getReleases(ARM_REPO_OWNER, ARM_REPO_NAME)

  return releases
    .filter(release => !release.draft && !release.prerelease)
    .filter(release => releaseHasAsset(release, distribution))
    .sort((a, b) => versions.compare(b.tag_name, a.tag_name))
}

/**
 * Find the newest vulkan-sdk-arm release with an asset for the detected Ubuntu
 * distribution.
 *
 * This only falls back across versions. A newer release which has no asset for
 * the detected distribution is skipped in favor of an older release built for
 * the same distribution.
 */
export async function getLatestArmRelease(): Promise<ArmSdkRelease | null> {
  const distribution = getLinuxArmDistribution()
  const [latest] = await getArmReleasesForDistribution(distribution)
  if (!latest) {
    return null
  }
  return { version: latest.tag_name, distribution }
}
