/*---------------------------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2025 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *--------------------------------------------------------------------------------------------*/

import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as path from 'node:path'
import * as downloader from './downloader'
import * as errors from './errors'
import * as input from './inputs'
import * as installerVulkan from './installer_vulkan'
import * as installerSwiftshader from './installer_swiftshader'
import * as installerLavapipe from './installer_lavapipe'
import * as platform from './platform'
import * as versionsVulkan from './versions_vulkan'

/**
 * Get Cache Keys
 *
 * Format will be "cache-OS-ARCH-vulkan-sdk-VERSION-HASH".
 * E.g. "cache-linux-x64-vulkan-sdk-1.3.250.1-hash".
 *
 * @param {string} version - The Vulkan SDK version.
 * @return { cachePrimaryKey: string; cacheRestoreKeys: string[]; }
 */
export function getCacheKeys(version: string): { cachePrimaryKey: string; cacheRestoreKeys: string[] } {
  // Note: getPlatform() is used to get "windows", instead of OS_PLATFORM value "win32"
  const cachePrimaryKey = `cache-${platform.getPlatform()}-${platform.OS_ARCH}-vulkan-sdk-${version}`
  const cacheRestoreKey1 = `cache-${platform.getPlatform()}-${platform.OS_ARCH}-vulkan-sdk-`
  const cacheRestoreKey2 = `cache-${platform.getPlatform()}-${platform.OS_ARCH}-`
  return { cachePrimaryKey, cacheRestoreKeys: [cacheRestoreKey1, cacheRestoreKey2] }
}

/**
 * Retrieves and installs the Vulkan SDK.
 *
 * @param {string} version - The version of the Vulkan SDK to install.
 * @param {string} destination - The directory where the Vulkan SDK will be installed.
 * @param {string[]} optional_components - An array of optional components to install alongside the SDK.
 * @param {boolean} use_cache - Whether to use a cached SDK, if available. And store SDK to cache, if not available.
 * @param {boolean} stripdown - Whether to reduce the size of the installed SDK for caching.
 * @param {boolean} install_runtime - Whether to install the Vulkan runtime.
 * @return {*}  {Promise<string>} A Promise that resolves to the path where the Vulkan SDK is installed.
 */
async function getVulkanSdk(
  version: string,
  destination: string,
  optionalComponents: string[],
  useCache: boolean,
  stripdown: boolean,
  installRuntime: boolean
): Promise<string> {
  let installPath: string

  const { cachePrimaryKey, cacheRestoreKeys } = await getCacheKeys(version)

  // restore from cache
  if (useCache) {
    let cacheHit: string | undefined
    if (platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) {
      const versionizedDestinationPath = path.normalize(`${destination}/${version}`)
      cacheHit = await cache.restoreCache([versionizedDestinationPath], cachePrimaryKey, cacheRestoreKeys)
    } else {
      cacheHit = await cache.restoreCache([destination], cachePrimaryKey, cacheRestoreKeys)
    }
    if (cacheHit === undefined) {
      core.info(`🎯 [Cache] Cache for 'Vulkan SDK' not found.`)
    } else {
      core.info(`🎯 [Cache] Restored Vulkan SDK in path: '${destination}'. Cache Restore ID: '${cacheHit}'.`)
      return destination // Exit early with the cached destination, e.g. C:\VulkanSDK
    }
  }

  /*
    Download and install RT and SDK with the following conditions:
     - if (use_cache = false)                    means cache is not used
     - if (use_cache = true && cacheHit = false) means cache is used, but not found
  */

  // Download and install SDK
  const vulkanSdkPath = await downloader.downloadVulkanSdk(version)
  installPath = await installerVulkan.installVulkanSdk(vulkanSdkPath, destination, version, optionalComponents)

  // Download and install Runtime after the SDK. This allows caching both.
  if ((platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) && installRuntime) {
    // Downloading and install the standalone Vulkan Runtime
    // The standalone Vulkan Runtime was only available for Windows (x64 and ARM64).
    // The last available version is 1.4.313.0.
    // It is now deprecated and no longer available for download.
    if (version <= '1.4.313.0') {
      const vulkanRuntimePath = await downloader.downloadVulkanRuntime(version)
      await installerVulkan.installVulkanRuntime(vulkanRuntimePath, destination, version)
    }
    // The Vulkan Runtime is installed a part of the SDK installer, but we reposition it to the runtime folder.
    // From version 1.4.313.1 onwards, the runtime is included in the SDK installer.
    if (version >= '1.4.313.1') {
      await installerVulkan.installVulkanRuntimeFromSdk(installPath)
    }
  }

  // cache install folder
  if (useCache) {
    if (stripdown) {
      installerVulkan.stripdownInstallationOfSdk(installPath)
    }
    try {
      const cacheId = await cache.saveCache([installPath], cachePrimaryKey)
      if (cacheId !== -1) {
        core.info(`🎯 [Cache] Saved Vulkan SDK in path: '${installPath}'. Cache Save ID: '${cacheId}'.`)
      }
    } catch (error) {
      core.warning((error as Error).message)
    }
  }
  return installPath
}

/**
 * This is the main function.
 *
 * The function needs to be exported to be found by github/local-action.
 *
 * @return {*}  {Promise<void>}
 */
export async function run(): Promise<void> {
  try {
    const inputs: input.Inputs = await input.getInputs()

    const version = await versionsVulkan.resolveVersion(inputs.version)

    let runtimePath = ''

    /* ----------------------------------------------------------------------
     * Install only runtime components, no SDK (install_runtime_only)
     * ---------------------------------------------------------------------- */

    if ((platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) && inputs.installRuntimeOnly) {
      if (!(platform.IS_WINDOWS || platform.IS_WINDOWS_ARM)) {
        core.warning('Vulkan Runtime installation is only supported on Windows.')
      } else {
        const vulkanRuntimePath = await downloader.downloadVulkanRuntime(version)

        // Set runtimePath for later verification
        runtimePath = await installerVulkan.installVulkanRuntime(vulkanRuntimePath, inputs.destination, version)

        // Set VULKAN_VERSION for runtime-only mode
        core.exportVariable('VULKAN_VERSION', version)
        core.info(`✔️ [ENV] Set env variable VULKAN_VERSION -> "${version}".`)
      }
    } else {
      /* ----------------------------------------------------------------------
       * Normal SDK installation
       * ---------------------------------------------------------------------- */

      const sdkPath = await getVulkanSdk(
        version,
        inputs.destination,
        inputs.optionalComponents,
        inputs.useCache,
        inputs.stripdown,
        inputs.installRuntime
      )

      const installPath = installerVulkan.getVulkanSdkPath(sdkPath, version)

      if (installerVulkan.verifyInstallationOfSdk(installPath)) {
        // Setup Paths to the Vulkan SDK
        //
        // https://vulkan.lunarg.com/doc/sdk/1.3.261.1/linux/getting_started.html#set-up-the-runtime-environment
        //
        // According to the docs one would "source ~/vulkan/1.x.yy.z/setup-env.sh".
        // But here we setup our paths by setting these environment variables ourself.
        // We set PATH, VULKAN_SDK, VK_LAYER_PATH, LD_LIBRARY_PATH and additionally VULKAN_VERSION.

        // export PATH=$VULKAN_SDK/bin:$PATH
        const binFolder = path.normalize(`${installPath}/bin`)
        core.addPath(binFolder)
        core.info(`✔️ [PATH] Added path to Vulkan SDK to environment variable PATH.`)

        // export VULKAN_SDK=~/vulkan/1.x.yy.z/x86_64
        core.exportVariable('VULKAN_SDK', installPath)
        core.info(`✔️ [ENV] Set env variable VULKAN_SDK -> "${installPath}".`)

        core.exportVariable('VULKAN_VERSION', version)
        core.info(`✔️ [ENV] Set env variable VULKAN_VERSION -> "${version}".`)

        if (platform.IS_LINUX || platform.IS_LINUX_ARM || platform.IS_MAC) {
          // export VK_LAYER_PATH=$VULKAN_SDK/share/vulkan/explicit_layer.d
          const vkLayerPath = `${installPath}/share/vulkan/explicit_layer.d`
          core.exportVariable('VK_LAYER_PATH', vkLayerPath)
          core.info(`✔️ [ENV] Set env variable VK_LAYER_PATH -> "${vkLayerPath}".`)

          // export LD_LIBRARY_PATH=$VULKAN_SDK/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
          const ldLibraryPath = process.env.LD_LIBRARY_PATH || ''
          const vkLdLibraryPath = `${installPath}/lib:${ldLibraryPath}`
          if (platform.IS_LINUX || platform.IS_LINUX_ARM) {
            core.exportVariable('LD_LIBRARY_PATH', vkLdLibraryPath)
            core.info(`✔️ [ENV] Set env variable LD_LIBRARY_PATH -> "${vkLdLibraryPath}".`)
          }
          if (platform.IS_MAC) {
            core.exportVariable('DYLD_LIBRARY_PATH', vkLdLibraryPath)
            core.info(`✔️ [ENV] Set env variable DYLD_LIBRARY_PATH -> "${vkLdLibraryPath}".`)
          }
        }
      } else {
        core.warning(`Could not find Vulkan SDK in ${installPath}`)
      }

      // Set runtimePath for later verification
      if ((platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) && inputs.installRuntime) {
        runtimePath = path.normalize(`${installPath}/runtime`)
      }
    }

    /* ----------------------------------------------------------------------
     * Verify Runtime Installation
     * ---------------------------------------------------------------------- */

    if ((platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) && inputs.installRuntime) {
      if (installerVulkan.verifyInstallationOfRuntime(runtimePath)) {
        core.info(`✔️ [INFO] Path to Vulkan Runtime: ${runtimePath}`)
      } else {
        core.warning(`Could not find Vulkan Runtime in ${runtimePath}`)
      }
    }

    /* ----------------------------------------------------------------------
     * Install SwiftShader
     * ---------------------------------------------------------------------- */

    if (platform.IS_WINDOWS && inputs.installSwiftshader) {
      core.info(`🚀 Installing SwiftShader library...`)
      const swiftshaderInstallPath = await installerSwiftshader.installSwiftShader(inputs.swiftshaderDestination)
      core.info(`✔️ [INFO] Path to SwiftShader: ${swiftshaderInstallPath}`)
    }

    /* ----------------------------------------------------------------------
     * Install Lavapipe
     * ---------------------------------------------------------------------- */

    if (platform.IS_WINDOWS && inputs.installLavapipe) {
      core.info(`🚀 Installing Lavapipe library...`)
      const LavapipeInstallPath = await installerLavapipe.installLavapipe(inputs.lavapipeDestination)
      core.info(`✔️ [INFO] Path to Lavapipe: ${LavapipeInstallPath}`)
    }

    core.info(`✅ Done.`)
  } catch (error) {
    errors.handleError(error as Error)
  }
}

// Execute the main function only if we are not running inside Jest tests.
// This prevents network calls and other side effects during unit tests.
if (typeof process.env.JEST_WORKER_ID === 'undefined') {
  run()
}
