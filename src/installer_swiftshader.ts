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
 * Install the SwiftShader library.
 *
 * @param {string} destination - The destination path for the SwiftShader library.
 * @param {boolean} useCache - Whether to use a cached SwiftShader library, if available.
 */
export async function installSwiftShader(destination: string, useCache: boolean): Promise<string> {
  // Get latest version info
  const { url: downloadUrl, version } = await getLatestVersion()

  // Check cache first
  if (useCache) {
    const cachedPath = tc.find('swiftshader', version)
    if (cachedPath) {
      core.info(`Found SwiftShader in cache at ${cachedPath}`)
      return cachedPath
    }
  }

  // Ensure the URL is valid
  try {
    if (!downloadUrl) throw new Error('SwiftShader download URL not found.')
    await http.isDownloadable('SwiftShader', version, downloadUrl)
  } catch (error) {
    errors.handleError(error as Error)
    throw error // Rethrow error, so it can be caught in tests
  }

  // Download and extract
  const archivePath = await tc.downloadTool(downloadUrl)
  const extractedPath = await tc.extractZip(archivePath, destination)

  // Cache the extracted directory
  if (useCache) {
    const installPath = await tc.cacheDir(extractedPath, 'swiftshader', version)
    core.info(`SwiftShader cached at ${installPath}`)
    return installPath
  }

  return extractedPath
}

/**
 * Get the latest SwiftShader version info.
 *
 * @returns {Promise<{ url: string; version: string }>} - The download URL and version.
 */
export async function getLatestVersion(): Promise<{ url: string; version: string }> {
  const latestVersions = await versionsRasterizers.getLatestVersionsJson()
  const info = latestVersions.latest['swiftshader-win64']

  if (!info?.url || !info?.version) {
    core.error('SwiftShader download URL or version not found.')
  }

  return { url: info.url, version: info.version }
}

/**
 * Verify the SwiftShader installation by checking for required files.
 *
 * @param {string} installPath
 * @returns {boolean} - True if installation is valid, false otherwise.
 */
export function verifyInstallation(installPath: string): boolean {
  // Note: All files are in the install folder (no subfolders like 'bin' etc.)
  const requiredFiles = ['vk_swiftshader.dll', 'vk_swiftshader_icd.json']
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(installPath, file))) {
      return false
    }
  }
  return true
}

/**
 * Setup SwiftShader ICD by registering it to the Windows registry.
 * Shows the bin folder path for debugging and copying DLLs to app folders.
 *
 * @param {string} installPath
 */
export function setupSwiftshader(installPath: string) {
  // Note: All files are in the install folder (no subfolders like 'bin' etc.)
  const binDir = path.normalize(`${installPath}`)
  core.info(`ℹ️ SwiftShader bin path: ${binDir}`)

  const icdPath = path.normalize(`${installPath}/vk_swiftshader_icd.json`)
  registerDriverInWindowsRegistry(icdPath)
}
