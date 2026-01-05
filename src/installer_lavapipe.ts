/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as tc from '@actions/tool-cache'
import * as errors from './errors'
import * as core from '@actions/core'
import * as versionsRasterizers from './versions_rasterizers'
import * as http from './http'
import * as path from 'node:path'

/**
 * Install the Mesa3D lavapipe library.
 *
 * @export
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
 * Compute Lavapipe ICD file paths for a given install path.
 *
 * @export
 * @param {string} installPath
 * @returns {string[]} array of ICD file paths
 */
export function setupLavapipe(installPath: string): string[] {
  return [path.normalize(`${installPath}/share/vulkan/icd.d/lvp_icd.x86_64.json`)]
}
