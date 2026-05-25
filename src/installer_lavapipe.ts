/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as errors from './errors'
import * as http from './http'
import * as platform from './platform'
import * as versionsRasterizers from './versions_rasterizers'
import { registerDriverInWindowsRegistry } from './windows'

/**
 * Install the Mesa3D lavapipe library.
 *
 * @param {string} destination - The destination path for the Mesa lavapipe.
 * @param {boolean} useCache - Whether to use a cache (Windows only).
 */
export async function installLavapipe(destination: string, useCache = false): Promise<string> {
  if (platform.IS_LINUX || platform.IS_LINUX_ARM) {
    return installLavapipeLinux()
  }
  if (platform.IS_WINDOWS) {
    return await installLavapipeWindows(destination, useCache)
  }
  throw new Error('Lavapipe installation is not supported on this platform.')
}

/**
 * Install lavapipe on Windows via pre-built binaries.
 */
async function installLavapipeWindows(destination: string, useCache = false): Promise<string> {
  // Get latest version info
  const { url: downloadUrl, version } = await getLatestVersion()

  // Check cache first
  if (useCache) {
    const cachedPath = tc.find('lavapipe', version)
    if (cachedPath) {
      core.info(`Found Lavapipe in cache at ${cachedPath}`)
      return cachedPath
    }
  }

  // Ensure the URL is valid
  try {
    if (!downloadUrl) throw new Error('Lavapipe download URL not found.')
    await http.isDownloadable('Lavapipe', version, downloadUrl)
  } catch (error) {
    errors.handleError(error as Error)
    throw error // Rethrow error, so it can be caught in tests
  }

  // Download and extract
  const archivePath = await tc.downloadTool(downloadUrl)
  const extractedPath = await tc.extractZip(archivePath, destination)

  // Cache the extracted directory
  if (useCache) {
    const installPath = await tc.cacheDir(extractedPath, 'lavapipe', version)
    core.info(`Lavapipe cached at ${installPath}`)
    return installPath
  }

  return extractedPath
}

/**
 * Install lavapipe on Linux via system package manager.
 *
 * @returns {string} Returns '/usr' as a placeholder — unused on Linux but keeps the return type consistent.
 */
function installLavapipeLinux(): string {
  core.info('🚀 Installing Mesa Vulkan drivers (lavapipe) via apt...')
  execSync('sudo apt-get update -qq', { stdio: 'inherit' })
  execSync('sudo apt-get install -y -qq mesa-vulkan-drivers', { stdio: 'inherit' })
  core.info('✔️ Mesa Vulkan drivers installed.')
  return '/usr'
}

/**
 * Get the latest Lavapipe version info.
 *
 * @returns {Promise<{ url: string; version: string }>} - The download URL and version.
 */
export async function getLatestVersion(): Promise<{ url: string; version: string }> {
  const latestVersions = await versionsRasterizers.getLatestVersionsJson()
  const info = latestVersions.latest['lavapipe-win64']

  if (!info?.url || !info?.version) {
    core.error('Lavapipe download URL or version not found.')
  }

  return { url: info.url, version: info.version }
}

/**
 * Verify the Lavapipe installation by checking for required files.
 *
 * @param {string} installPath - The installation path to verify.
 * @returns {boolean} - True if installation is valid, false otherwise.
 */
export function verifyInstallation(installPath: string): boolean {
  if (platform.IS_LINUX || platform.IS_LINUX_ARM) {
    const linuxIcdPaths = ['/usr/share/vulkan/icd.d/lvp_icd.x86_64.json', '/usr/share/vulkan/icd.d/lvp_icd.json']
    return linuxIcdPaths.some(p => fs.existsSync(p))
  }
  const requiredFiles = ['/bin/vulkan_lvp.dll', '/share/vulkan/icd.d/lvp_icd.x86_64.json']
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(installPath, file))) {
      return false
    }
  }
  return true
}

/**
 * Setup Lavapipe ICD.
 * On Windows: registers the ICD in the Windows registry.
 * On Linux: the ICD is auto-detected by the Vulkan loader from /usr/share/vulkan/icd.d/.
 *
 * @param {string} installPath
 */
export function setupLavapipe(installPath: string) {
  const binDir = path.normalize(`${installPath}/bin`)
  core.info(`ℹ️ Lavapipe bin path: ${binDir}`)

  const icdPath = path.normalize(`${installPath}/share/vulkan/icd.d/lvp_icd.x86_64.json`)
  registerDriverInWindowsRegistry(icdPath)
}
