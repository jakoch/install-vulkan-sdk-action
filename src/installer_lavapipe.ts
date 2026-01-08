/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as errors from './errors'
import * as http from './http'
import * as versionsRasterizers from './versions_rasterizers'
import { registerDriverInWindowsRegistry } from './windows'

/**
 * Install the Mesa3D lavapipe library.
 *
 * @param {string} destination - The destination path for the Mesa lavapipe.
 * @param {boolean} useCache - Whether to use a cached
 */
export async function installLavapipe(destination: string, useCache = false): Promise<string> {
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
  const requiredFiles = ['/bin/vulkan_lvp.dll', '/share/vulkan/icd.d/lvp_icd.x86_64.json']
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(installPath, file))) {
      return false
    }
  }
  return true
}

/**
 * Setup Lavapipe ICD by registering it to the Windows registry.
 * Shows the bin folder path for debugging and copying DLLs to app folders.
 *
 * @param {string} installPath
 */
export function setupLavapipe(installPath: string) {
  const binDir = path.normalize(`${installPath}/bin`)
  core.info(`ℹ️ Lavapipe bin path: ${binDir}`)

  const icdPath = path.normalize(`${installPath}/share/vulkan/icd.d/lvp_icd.x86_64.json`)
  registerDriverInWindowsRegistry(icdPath)
}
