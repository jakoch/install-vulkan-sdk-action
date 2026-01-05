/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as core from '@actions/core'
import * as httpm from '@actions/http-client'

export const client: httpm.HttpClient = new httpm.HttpClient('install-vulkan-sdk-action', [], {
  keepAlive: false,
  allowRedirects: true,
  maxRedirects: 3
})

/**
 * Download the given URL and return the response body as text.
 * Throws on non-2xx responses.
 */
export async function download(url: string): Promise<string> {
  const response = await client.get(url)
  const statusCode = response.message.statusCode
  if (statusCode !== undefined && statusCode >= 400) {
    throw new Error(`Failed to download ${url} - HTTP status ${statusCode}`)
  }
  return response.readBody()
}

/**
 * is_downloadable checks, if an URL returns HTTP Status Code 200.
 * Otherwise, it throws an error.
 *
 * @param {string} name - The nice name.
 * @param {string} version - The version of the download.
 * @param {string} url - The URL.
 */
export async function isDownloadable(name: string, version: string, url: string): Promise<void> {
  try {
    const HttpClientResponse = await client.head(url)
    const statusCode = HttpClientResponse.message.statusCode
    if (statusCode !== undefined) {
      if (statusCode >= 400) {
        throw new Error(`❌ Http(Error): The requested ${name} ${version} is not downloadable using URL: ${url}.`)
      }
      if (statusCode === 200) {
        core.info(`✔️ Http(200): The requested ${name} ${version} is downloadable.`)
      }
    }
  } catch (error) {
    // Rethrow the error to let the caller handle it.
    // This enables retrying with a lower version using a for-loop with try-catch.
    if (error instanceof Error) {
      throw error
    }
  }
}
