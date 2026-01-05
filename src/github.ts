/*---------------------------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2025 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *--------------------------------------------------------------------------------------------*/

import * as core from '@actions/core'
import * as http from './http'

export interface GithubReleaseAssets {
  name: string
  url: string
  // biome-ignore lint: style/useNamingConvention
  browser_download_url: string
}

export interface GithubRelease {
  // biome-ignore lint: style/useNamingConvention
  tag_name: string
  // biome-ignore lint: style/useNamingConvention
  assets_url: string
  // biome-ignore lint: style/useNamingConvention
  upload_url: string
  assets: GithubReleaseAssets[]
}

/**
 * Get the latest Github Release as JSON.
 *
 * This is a get request to an GITHUB REST API endpoint,
 * which returns the latest release of a repository..
 * It counts toward the GITHUB API rate-limit.
 *
 * This function supports authentication via a GITHUB_TOKEN env variable.
 * If no token is provided, it will issue an unauthenticated request.
 * This may lead to hitting rate-limits quickly.
 *
 * @export
 * @param {string} owner - The GitHub owner (username or organization).
 * @param {string} repo - The name of the GitHub repository.
 * @return {*}  {(Promise<GithubRelease | null>)}
 */
export const getLatestRelease = async (owner: string, repo: string): Promise<GithubRelease | null> => {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`

  let response: { result: GithubRelease | null }

  if (!process.env.GITHUB_TOKEN) {
    core.info('To avoid hitting GitHub API rate limits, please set a GITHUB_TOKEN in your environment.')
    response = await http.client.getJson<GithubRelease>(url)
  } else {
    // biome-ignore lint: lint/style/useNamingConvention: This object property name part should be in camelCase.
    const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}
    response = await http.client.getJson<GithubRelease>(url, headers)
  }

  if (!response.result) {
    throw new Error(`Unable to retrieve the latest release versions from '${url}'`)
  }

  return response.result
}

/**
 * Get the latest version (= tag_name) of a repository from GitHub Releases.
 *
 * @export
 * @param {string} owner - The GitHub owner (username or organization).
 * @param {string} repo - The name of the GitHub repository.
 * @return {Promise<string | null>} The version number, or null if an error occurs.
 */
export const getLatestVersion = async (owner: string, repo: string): Promise<string | null> => {
  try {
    const response = await getLatestRelease(owner, repo)
    if (response && response.tag_name) {
      return response.tag_name
    } else {
      return null // Unable to retrieve the version.
    }
  } catch (error) {
    core.error(`Error while fetching the latest release version: ${error}`)
    return null
  }
}
