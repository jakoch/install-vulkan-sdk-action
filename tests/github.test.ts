import * as http from '../src/http'
import * as core from '@actions/core'
import { getLatestRelease, getLatestVersion, type GithubRelease } from '../src/github'

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

    expect(http.client.getJson).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo/releases/latest')
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
})
