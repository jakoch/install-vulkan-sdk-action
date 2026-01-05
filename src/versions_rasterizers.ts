/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as github from './github'

/**
 * Contains the latest versions of the rasterizers.
 *
 * @interface LatestVersions
 */
interface LatestVersions {
  latest: {
    'swiftshader-win64': {
      version: string
      tag: string
      url: string
    }
    'lavapipe-win64': {
      version: string
      tag: string
      url: string
    }
  }
}

/**
 * Cached result of the versions.json file.
 */
let latestVersionsPromise: Promise<LatestVersions> | null = null

/**
 * Get the latest versions.json file from the GitHub repository.
 *
 * @export
 * @returns {Promise<LatestVersions>} - The latest versions.json file.
 */
export async function getLatestVersionsJson(): Promise<LatestVersions> {
  if (!latestVersionsPromise) {
    latestVersionsPromise = (async () => {
      const latestRelease = await github.getLatestRelease('jakoch', 'rasterizers')
      if (!latestRelease) throw new Error('Failed to get latest release.')

      const versionsJson = latestRelease.assets.find(asset => asset.name === 'versions.json')
      if (!versionsJson) throw new Error('versions.json not found in latest release.')

      const response = await fetch(versionsJson.browser_download_url)
      if (!response.ok) throw new Error('Failed to download versions.json.')

      const json = await response.json() // Fix: Await the response.json() call
      return json
    })()
  }

  return await latestVersionsPromise
}

// only for testing: reset cache
export function __resetLatestVersionsJsonCacheForTests() {
  latestVersionsPromise = null
}
