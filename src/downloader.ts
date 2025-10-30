/*---------------------------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2025 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *--------------------------------------------------------------------------------------------*/

import * as core from '@actions/core'
import * as tc from '@actions/tool-cache' // https://github.com/actions/toolkit/tree/main/packages/tool-cache
import * as path from 'node:path'
import * as http from './http'
import * as errors from './errors'
import * as platform from './platform'
import * as versions from './versions'
import * as versionsVulkan from './versions_vulkan'
import { compareFileSha } from './verify'

/**
 * Get download url for Vulkan SDK.
 *
 * @export
 * @param {string} version - The SDK version to download.
 * @return {*}  {Promise<string>} Returns the download url.
 */
export async function getUrlVulkanSdk(version: string): Promise<string> {
  const platformName = platform.getPlatform() // For download urls see https://vulkan.lunarg.com/sdk/home

  // Windows:
  // Latest Version:  https://sdk.lunarg.com/sdk/download/latest/windows/vulkan-sdk.exe
  // Versionized:     https://sdk.lunarg.com/sdk/download/1.3.250.1/windows/VulkanSDK-1.3.250.1-Installer.exe
  // Since 1.4.313.0: https://sdk.lunarg.com/sdk/download/1.4.313.0/windows/vulkansdk-windows-X64-1.4.313.0.exe
  //
  // Warm (Windows ARM64):
  // Latest Version:  https://sdk.lunarg.com/sdk/download/latest/warm/vulkan_sdk.exe
  // Versionized:     https://sdk.lunarg.com/sdk/download/1.4.304.0/warm/InstallVulkanARM64-1.4.304.0.exe
  // Sicne 1.4.313.0: https://sdk.lunarg.com/sdk/download/1.4.313.0/warm/vulkansdk-windows-ARM64-1.4.313.0.exe

  const downloadBaseUrl = `https://sdk.lunarg.com/sdk/download/${version}/${platformName}`

  let vulkanSdkUrl = ''

  // note: condition order matters, e.g. IS_WINDOWS_ARM before IS_WINDOWS

  if (platform.IS_WINDOWS_ARM) {
    // For versions up to 1.4.309.0 the filename is "InstallVulkanARM64-${version}.exe".
    // For versions after 1.4.309.0 the filename is "vulkansdk-windows-ARM64-${version}.exe".
    if (1 === versions.compare(version, '1.4.309.0')) {
      vulkanSdkUrl = `${downloadBaseUrl}/vulkansdk-windows-ARM64-${version}.exe`
    } else {
      vulkanSdkUrl = `${downloadBaseUrl}/InstallVulkanARM64-${version}.exe`
    }
  } else if (platform.IS_WINDOWS) {
    // For versions up to 1.4.309.0 the filename is "InstallVulkan-${version}.exe".
    // For versions after 1.4.309.0 the filename is "vulkansdk-windows-X64-${version}.exe".
    if (1 === versions.compare(version, '1.4.309.0')) {
      vulkanSdkUrl = `${downloadBaseUrl}/vulkansdk-windows-X64-${version}.exe`
    } else {
      vulkanSdkUrl = `${downloadBaseUrl}/VulkanSDK-${version}-Installer.exe`
    }
  } else if (platform.IS_LINUX_ARM) {
    let distributionVersion = '24.04' // default to 24.04
    if (platform.getLinuxDistributionVersionId() === '22.04') {
      distributionVersion = '22.04'
    }
    // https://github.com/jakoch/vulkan-sdk-arm/releases/download/1.4.304.0/vulkansdk-ubuntu-22.04-arm-1.4.304.0.tar.xz
    const downloadBaseUrl = `https://github.com/jakoch/vulkan-sdk-arm/releases/download/${version}`
    vulkanSdkUrl = `${downloadBaseUrl}/vulkansdk-ubuntu-${distributionVersion}-arm-${version}.tar.xz`
  } else if (platform.IS_LINUX) {
    // For versions up to 1.3.250.1 the ending is ".tar.gz".
    // For versions after 1.3.250.1 the ending is ".tar.xz".
    let extension = 'tar.gz'
    if (1 === versions.compare(version, '1.3.250.1')) {
      extension = 'tar.xz'
    }
    vulkanSdkUrl = `${downloadBaseUrl}/vulkansdk-linux-x86_64-${version}.${extension}`
  } else if (platform.IS_MAC) {
    // For versions up to 1.3.290.0 the ending is ".dmg".
    // For versios after 1.3.290.0 the ending is ".zip".
    let extension = 'dmg'
    if (1 === versions.compare(version, '1.3.290.0')) {
      extension = 'zip'
    }
    vulkanSdkUrl = `${downloadBaseUrl}/vulkansdk-macos-${version}.${extension}`
  }

  await http.isDownloadable('VULKAN_SDK', version, vulkanSdkUrl)

  return vulkanSdkUrl
}

/**
 * Get download URL for Vulkan Runtime.
 *
 * Windows:
 * Latest Version:  https://sdk.lunarg.com/sdk/download/latest/windows/vulkan-runtime-components.zip
 * Versionized:     https://sdk.lunarg.com/sdk/download/1.3.250.1/windows/VulkanRT-1.3.250.1-Components.zip
 *
 * Warm (Windows ARM64):
 * Latest Version:  https://sdk.lunarg.com/sdk/download/latest/warm/vulkan-runtime-components.zip
 * Normalized:      https://sdk.lunarg.com/sdk/download/1.4.304.0/warm/vulkan-runtime-components.zip
 * Versionized:     https://sdk.lunarg.com/sdk/download/1.4.304.0/warm/VulkanRT-ARM64-1.4.304.0-Installer.exe
 *
 * @export
 * @param {string} version - The runtime version to download.
 * @return {*}  {Promise<string>} Returns the download url.
 */
export async function getUrlVulkanRuntime(version: string): Promise<string> {
  try {
    let currentVersion = version
    const platformName = platform.getPlatform()
    const availableVersions = await versionsVulkan.getAvailableVersions()

    if (availableVersions === null) {
      throw new Error('No available versions found')
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      let vulkanRuntimeUrl = ''
      if (platformName === 'windows') {
        // https://sdk.lunarg.com/sdk/download/1.3.250.1/windows/VulkanRT-1.3.250.1-Components.zip
        vulkanRuntimeUrl = `https://sdk.lunarg.com/sdk/download/${currentVersion}/${platformName}/vulkan-runtime-components.zip`
      }
      if (platformName === 'warm') {
        // https://sdk.lunarg.com/sdk/download/1.4.309.0/warm/VulkanRT-ARM64-1.4.309.0-Components.zip
        vulkanRuntimeUrl = `https://sdk.lunarg.com/sdk/download/${currentVersion}/${platformName}/vulkan-runtime-components.zip`
      }
      try {
        // isDownloadable throws, if the download is not available
        await http.isDownloadable('VULKAN_RUNTIME', currentVersion, vulkanRuntimeUrl)
        return vulkanRuntimeUrl
      } catch (error) {
        // if download not available, try a lower version
        core.info(`Attempt ${attempt}: Vulkan runtime for version ${currentVersion} is not downloadable.`)
        core.info(`Available versions: ${JSON.stringify(availableVersions, null, 2)}`)

        const lowerVersion = await versionsVulkan.getLowerVersion(currentVersion, availableVersions.versions)

        if (lowerVersion === currentVersion) {
          core.info(`No lower version available for Vulkan runtime version ${currentVersion}.`)
        }

        core.info(`Trying to download using a lower version ${lowerVersion}...`)
        currentVersion = lowerVersion
      }
    }
    throw new Error('Failed to find a downloadable Vulkan runtime version after 3 attempts.')
  } catch (error) {
    errors.handleError(error as Error)
    throw error
  }
}

/**
 * Download Vulkan SDK.
 *
 * @export
 * @param {string} version - The version to download.
 * @return {*}  {Promise<string>} Download location.
 */
export async function downloadVulkanSdk(version: string): Promise<string> {
  core.info(`🔽 Downloading Vulkan SDK ${version}`)
  const url = await getUrlVulkanSdk(version)
  core.info(`    URL: ${url}`)
  const sdkPath = await tc.downloadTool(url, path.join(platform.TEMP_DIR, getVulkanSdkFilename(version)))
  core.info(`✔️ Download completed successfully!`)
  core.info(`   File: ${sdkPath}`)

  if (platform.IS_LINUX_ARM) {
    core.info(`   Skipping SHA verification for custom ARM build.`)
  } else {
    const expectedSha = await fetchExpectedSha(version, path.basename(sdkPath))
    const verified = await compareFileSha(sdkPath, expectedSha, true)
    if (!verified) throw new Error(`SHA verification failed for installer: ${sdkPath}`)
  }

  return sdkPath
}

/**
 * Download Vulkan Runtime (Windows only).
 *
 * Two use cases:
 * 1) This is the separate runtime installer for versions < 1.4.313.1.
 *    After 1.4.313.1 the runtime is bundled with the SDK installer, see
 *    installVulkanRuntimeFromSdk() in installer_vulkan.ts.
 * 2) This is used, if the user wants to install only the runtime without SDK!
 *
 * @export
 * @param {string} version - The version to download.
 * @return {*}  {Promise<string>} Download location.
 */
export async function downloadVulkanRuntime(version: string): Promise<string> {
  core.info(`🔽 Downloading Vulkan Runtime ${version}`)
  const url = await getUrlVulkanRuntime(version)
  core.info(`   URL: ${url}`)
  const runtimePath = await tc.downloadTool(url, path.join(platform.TEMP_DIR, `vulkan-runtime-components.zip`))
  core.info(`✔️ Download completed successfully!`)
  core.info(`    File: ${runtimePath}`)
  return runtimePath
}

/**
 * Returns the platform-based name for the Vulkan SDK archive or installer.
 *
 * @export
 * @param {string} version- The vulkan sdk version number string.
 * @return {*}  {string} Platform-based name for the Vulkan SDK archive or installer.
 */
export function getVulkanSdkFilename(version: string): string {
  if (platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) {
    // The download name is "VulkanSDK-Installer.exe" for both
    // "vulkansdk-windows-X64-${version}.exe" and
    // "vulkansdk-windows-ARM64-${version}.exe".
    return `VulkanSDK-Installer.exe`
  }
  if (platform.IS_LINUX || platform.IS_LINUX_ARM) {
    // For versions up to 1.3.250.1 the ending is ".tar.gz".
    // For versions after 1.3.250.1 the ending is ".tar.xz".
    if (1 === versions.compare(version, '1.3.250.1')) {
      return `vulkansdk-linux-x86_64.tar.xz`
    }
    return `vulkansdk-linux-x86_64.tar.gz`
  }
  if (platform.IS_MAC) {
    // For versions up to 1.3.290.0 the ending is ".dmg".
    // For versions after 1.3.290.0 the ending is ".zip".
    if (1 === versions.compare(version, '1.3.290.0')) {
      return `vulkansdk-macos.zip`
    }
    return `vulkansdk-macos.dmg`
  }
  return 'not-implemented-for-platform'
}

/**
 * Fetch the expected SHA from the Lunarg API for a given version/platform/file.
 *
 * Windows: https://vulkan.lunarg.com/sdk/sha/1.4.328.1/windows/vulkansdk-windows-X64-1.4.328.1.exe.json
 */
export function fetchExpectedSha(version: string, fileName: string): Promise<string> {
  // During unit tests (Jest) skip network calls and return an empty string.
  const runningUnderJest = typeof process.env.JEST_WORKER_ID !== 'undefined'
  if (runningUnderJest) {
    core.info('Skipping fetchExpectedSha while running under Jest')
    return Promise.resolve('')
  }

  return new Promise((resolve, reject) => {
    const platformName = platform.getPlatform()
    const url = `https://sdk.lunarg.com/sdk/sha/${version}/${platformName}/${fileName}.json`
    core.info(`   SHA HASH URL: ${url}`)
    http
      .download(url)
      .then(body => {
        try {
          const parsed = JSON.parse(body)
          if (parsed && parsed.sha) {
            resolve(parsed.sha)
          } else {
            reject(new Error('Unexpected response shape from Lunarg SHA API'))
          }
        } catch (err) {
          reject(err)
        }
      })
      .catch(err => reject(err))
  })
}
