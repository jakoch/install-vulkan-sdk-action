/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import { getLatestVersionsJson, __resetLatestVersionsJsonCacheForTests } from '../src/versions_rasterizers'
import * as github from '../src/github'

const mockVersionsJson = {
  latest: {
    'swiftshader-win64': {
      version: '1.2.3',
      tag: 'v1.2.3',
      url: 'https://example.com/swiftshader.zip'
    },
    'lavapipe-win64': {
      version: '4.5.6',
      tag: 'v4.5.6',
      url: 'https://example.com/lavapipe.zip'
    }
  }
}

describe('getLatestVersionsJson', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    __resetLatestVersionsJsonCacheForTests() // Reset the cache before each test
  })

  it('returns parsed versions.json from the latest release', async () => {
    // Mock github.getLatestRelease
    const mockAsset = {
      name: 'versions.json',
      browser_download_url: 'https://example.com/versions.json'
    }

    jest.spyOn(github, 'getLatestRelease').mockResolvedValue({
      assets: [mockAsset]
    } as any)

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockVersionsJson)
    })

    const result = await getLatestVersionsJson()
    expect(result).toEqual(mockVersionsJson)
  })

  it('throws if no latest release is found', async () => {
    jest.spyOn(github, 'getLatestRelease').mockResolvedValue(null)

    await expect(getLatestVersionsJson()).rejects.toThrow('Failed to get latest release.')
  })

  it('throws if versions.json is not in assets', async () => {
    const mockLatestRelease: github.GithubRelease = {
      tag_name: 'v1.0.0',
      assets_url: 'https://api.github.com/repos/jakoch/rasterizers/releases/assets',
      upload_url: 'https://uploads.github.com/repos/jakoch/rasterizers/releases/{id}/assets{?name,label}',
      assets: [
        {
          name: 'versions.NOT.json',
          url: 'https://example.com/versions.json',
          browser_download_url: 'https://example.com/versions.json'
        }
      ]
    }

    jest.spyOn(github, 'getLatestRelease').mockResolvedValue(mockLatestRelease)

    await expect(getLatestVersionsJson()).rejects.toThrow('versions.json not found in latest release.')
  })

  it('throws if fetch fails', async () => {
    jest.spyOn(github, 'getLatestRelease').mockResolvedValue({
      assets: [
        {
          name: 'versions.json',
          browser_download_url: 'https://example.com/versions.json'
        }
      ]
    } as any)

    global.fetch = jest.fn().mockResolvedValue({
      ok: false
    })

    await expect(getLatestVersionsJson()).rejects.toThrow('Failed to download versions.json.')
  })

  it('caches the result after the first call', async () => {
    // Call once to prime the cache
    jest.spyOn(github, 'getLatestRelease').mockResolvedValue({
      assets: [
        {
          name: 'versions.json',
          browser_download_url: 'https://example.com/versions.json'
        }
      ]
    } as any)

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockVersionsJson)
    })

    const first = await getLatestVersionsJson()
    const second = await getLatestVersionsJson()

    expect(first).toBe(second) // Same cached object
    expect(github.getLatestRelease).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
