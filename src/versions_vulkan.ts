/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as core from '@actions/core'
import * as http from './http'
import * as platform from './platform'
import * as versions from './versions'

// Vulkan SDK Version Query and Download API
// https://vulkan.lunarg.com/content/view/latest-sdk-version-api

/**
 * Latest Version Response.
 *
 * @see https://vulkan.lunarg.com/sdk/latest.json
 *
 * Example:
 * ```json
 * {"linux":"1.4.304.0","mac":"1.4.304.0","warm":"1.4.304.0","windows":"1.4.304.0"}
 * ```
 *
 * @interface LatestVersionResponse
 */
interface LatestVersionResponse {
  linux: string
  mac: string
  warm: string
  windows: string
}

/**
 * Get a list of all available SDK versions.
 *
 * This is either a list of all available versions for all platforms or a list of versions for a specific platform.
 *
 * @see https://vulkan.lunarg.com/sdk/versions.json (version list regardless of platform)
 * @see https://vulkan.lunarg.com/sdk/versions/{platform}.json (version list for a specific platform)
 * @see https://vulkan.lunarg.com/sdk/versions/windows.json
 * @see https://vulkan.lunarg.com/sdk/versions/linux.json
 * @see https://vulkan.lunarg.com/sdk/versions/mac.json
 * @see https://vulkan.lunarg.com/sdk/versions/warm.json
 *
 * Example:
 * ```json
 * ["1.4.328.1","1.4.321.1","1.4.321.0","1.4.313.2","1.4.313.1","1.4.313.0",
 * "1.4.309.0","1.4.304.1","1.4.304.0","1.3.296.0","1.3.290.0","1.3.283.0",
 * "1.3.280.1","1.3.280.0","1.3.275.0","1.3.268.1","1.3.268.0"]
 * ```
 *
 * @interface AvailableVersions
 */
interface AvailableVersions {
  versions: string[]
}

/**
 * Get list of all available versions for this platform.
 *
 * The platform is determined by the platform module.
 *
 * @see AvailableVersions
 *
 * @return {*}  {(Promise<AvailableVersions | null>)}
 */
export const getAvailableVersions = async (): Promise<AvailableVersions | null> => {
  const platformName = platform.getPlatform()
  const url = `https://vulkan.lunarg.com/sdk/versions/${platformName}.json`
  const response = await http.client.getJson<string[]>(url)
  if (!response.result) {
    throw new Error(`Unable to retrieve the list of all available VULKAN SDK versions from '${url}'`)
  }
  return { versions: response.result }
}

/**
 * Get the list of latest versions for each platform.
 *
 * @see LatestVersionResponse
 *
 * @return {*}  {(Promise<LatestVersionResponse | null>)}
 */
export const getLatestVersions = async (): Promise<LatestVersionResponse | null> => {
  const url = `https://vulkan.lunarg.com/sdk/latest.json`
  const response = await http.client.getJson<LatestVersionResponse>(url)
  if (!response.result) {
    throw new Error(`Unable to retrieve the latest version information from '${url}'`)
  }
  return response.result
}

/**
 * Get latest version for platform.
 * They might have a different latest versions! ¯\\_(ツ)_/¯
 *
 * @see LatestVersionResponse
 *
 * @param {LatestVersionResponse} latestVersion
 * @return {*}  {string}
 */
export function getLatestVersionForPlatform(latestVersion: LatestVersionResponse): string {
  if (platform.IS_WINDOWS) {
    return latestVersion.windows
  }
  if (platform.IS_WINDOWS_ARM) {
    return latestVersion.warm
  }
  if (platform.IS_LINUX || platform.IS_LINUX_ARM) {
    return latestVersion.linux
  }
  if (platform.IS_MAC) {
    return latestVersion.mac
  }
  return ''
}

/**
 * Resolve "latest" version
 *
 * This function resolves the string literal "latest" to the latest version number.
 * "latest" might be set by the user or during input validation, when the version field is empty.
 * The version to download is either
 *    a) a manually passed in version (pass-through)
 * or b) the automatically resolved latest version for the platform.
 *
 * @param {string} version
 * @return {*}  {Promise<string>}
 */
export async function resolveVersion(version: string): Promise<string> {
  let versionToDownload: string = version
  if (version === 'latest') {
    try {
      const latestVersion: LatestVersionResponse | null = await getLatestVersions()
      if (latestVersion !== null) {
        versionToDownload = getLatestVersionForPlatform(latestVersion)
        core.info(`Latest Version: ${versionToDownload}`)
      }
    } catch (error) {
      let errorMessage = 'Failed to resolve_version()'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      core.setFailed(errorMessage)
    }
  }
  return versionToDownload
}

/**
 * Get the next lower version from the available versions list.
 *
 * It uses getAvailableVersions() to retrieve the version list.
 * The raw JSON is an array sorted in descending order.
 * If the current version is not found or is already the lowest,
 * return the same version.
 *
 * @param {string} version - The current version.
 * @param {string[]} allVersions - The list of all available versions.
 * @return {*}  {Promise<string>} The next lower version.
 */
export async function getLowerVersion(version: string, allVersions: string[]): Promise<string> {
  // satisfy the "require-await" lint rule without changing behavior
  await Promise.resolve()

  if (!allVersions || allVersions.length === 0) {
    return Promise.reject(new Error('versions list is empty'))
  }
  const sortedVersions = allVersions.sort((a, b) => versions.compare(b, a))

  // Find the index of the given version
  const index = sortedVersions.indexOf(version)

  // If version not found, return the current version
  if (index === -1) {
    return version
  }

  // If it's the last version in the sorted array (lowest version), return it
  if (index === sortedVersions.length - 1) {
    return version
  }

  // Return the next lower version in the array
  return sortedVersions[index + 1]
}
