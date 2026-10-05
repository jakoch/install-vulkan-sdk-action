/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as http from '../src/http'
import * as core from '@actions/core'
import { getLatestRelease, getLatestVersion, githubTokenStore, GithubTokenStore, type GithubRelease } from '../src/github'

jest.mock('../src/http')
jest.mock('@actions/core')

describe('GitHub Release API', () => {
  const mockRelease: GithubRelease = {
    tag_name: 'v1.2.3',
    assets_url: 'https://api.github.com/repos/owner/repo/releases/assets',
    upload_url: 'https://uploads.github.com/repos/owner/repo/releases/123/assets',
    assets: [
      {
        name: 'release.zip',
        url: 'https://api.github.com/repos/owner/repo/releases/assets/456',
        browser_download_url: 'https://github.com/owner/repo/releases/download/v1.2.3/release.zip'
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('getLatestRelease should return a GitHub release object', async () => {
    ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: mockRelease })

    const result = await getLatestRelease('owner', 'repo')

    // Ensure the request was made to the correct URL. Headers may or may not be passed.
    expect((http.client.getJson as jest.Mock).mock.calls[0][0]).toBe('https://api.github.com/repos/owner/repo/releases/latest')
    expect(result).toEqual(mockRelease)
  })

  test('getLatestRelease should throw an error if no release is found', async () => {
    ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: null })

    await expect(getLatestRelease('owner', 'repo')).rejects.toThrow(
      "Unable to retrieve the latest release versions from 'https://api.github.com/repos/owner/repo/releases/latest'"
    )
  })

  test('getLatestVersion should return the latest version tag', async () => {
    ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: mockRelease })

    const version = await getLatestVersion('owner', 'repo')

    expect(version).toBe('v1.2.3')
  })

  test('getLatestVersion should return null if no release is found', async () => {
    ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: null })

    const version = await getLatestVersion('owner', 'repo')

    expect(version).toBeNull()
  })

  test('getLatestVersion should return null if release exists but tagName is missing', async () => {
    const releaseWithoutTag = {
      assets_url: 'https://api.github.com/repos/owner/repo/releases/assets',
      upload_url: 'https://uploads.github.com/repos/owner/repo/releases/123/assets',
      assets: []
    } as unknown as GithubRelease // Cast to match expected type
    ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: releaseWithoutTag })

    const version = await getLatestVersion('owner', 'repo')

    expect(version).toBeNull()
  })

  test('getLatestVersion should handle errors gracefully and return null', async () => {
    ;(http.client.getJson as jest.Mock).mockRejectedValue(new Error('Network error'))

    const version = await getLatestVersion('owner', 'repo')

    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Error while fetching the latest release version'))
    expect(version).toBeNull()
  })

  // githubTokenStore is a module-level singleton whose setToken() ignores later
  // calls once a token is stored, so the auth tests pin the state they need.
  test('getLatestRelease should pass an Authorization header when a token is set', async () => {
    ;(http.client.getJson as jest.Mock).mockResolvedValue({ result: mockRelease })
    githubTokenStore.setToken('secret-token-value')

    await getLatestRelease('owner', 'repo')

    expect(http.client.getJson).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo/releases/latest', {
      Authorization: 'Bearer secret-token-value'
    })
    // The token is registered as a secret so it is masked in logs.
    expect(core.setSecret).toHaveBeenCalledWith('secret-token-value')
  })

  test('getLatestRelease should hint at rate limits when unauthenticated', async () => {
    let fresh: typeof import('../src/github')
    let freshHttp: typeof import('../src/http')
    let freshCore: typeof import('@actions/core')
    jest.isolateModules(() => {
      freshHttp = require('../src/http')
      freshCore = require('@actions/core')
      fresh = require('../src/github')
    })
    ;(freshHttp!.client.getJson as jest.Mock).mockResolvedValue({ result: mockRelease })

    await fresh!.getLatestRelease('owner', 'repo')

    // The unauthenticated branch calls getJson(url) with no headers argument.
    expect(freshHttp!.client.getJson).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo/releases/latest')
    expect(freshCore!.info).toHaveBeenCalledWith(expect.stringContaining('rate limits'))
  })
})

describe('githubTokenStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('setToken should register a non-empty token as a secret', () => {
    const store = new GithubTokenStore()

    store.setToken('abc123')

    expect(store.getToken()).toBe('abc123')
    expect(core.setSecret).toHaveBeenCalledWith('abc123')
  })

  test('setToken should not register an empty token as a secret', () => {
    const store = new GithubTokenStore()

    store.setToken('')

    expect(store.getToken()).toBe('')
    expect(core.setSecret).not.toHaveBeenCalled()
  })

  test('setToken should keep the first token and ignore later calls', () => {
    const store = new GithubTokenStore()

    store.setToken('first-token')
    store.setToken('second-token')

    expect(store.getToken()).toBe('first-token')
    expect(core.setSecret).toHaveBeenCalledTimes(1)
    expect(core.setSecret).toHaveBeenCalledWith('first-token')
  })

  test('getToken should return undefined when no token was set', () => {
    const store = new GithubTokenStore()

    expect(store.getToken()).toBeUndefined()
  })
})
