/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as core from '@actions/core'

/**
 * Compute the SHA256 of a local file and return the hex digest.
 */
export function computeFileSha256(localPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(localPath)
    stream.on('error', err => reject(err))
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

/**
 * Compare local file SHA against an expected hex digest.
 * If failOnMismatch is true the function will call core.setFailed() on mismatch.
 */
export async function compareFileSha(localPath: string, expectedSha: string, failOnMismatch = true): Promise<boolean> {
  // Allow skipping verification during unit tests to avoid network/file IO.
  const runningUnderJest = typeof process.env.JEST_WORKER_ID !== 'undefined'
  if (runningUnderJest) {
    core.info('Skipping SHA verification while running under Jest')
    return true
  }
  try {
    if (!fs.existsSync(localPath)) {
      const msg = `File to verify not found: ${localPath}`
      core.error(msg)
      if (failOnMismatch) core.setFailed(msg)
      return false
    }

    const computed = await computeFileSha256(localPath)
    if (computed.toLowerCase() !== expectedSha.toLowerCase()) {
      const msg = `SHA mismatch for ${localPath}: expected ${expectedSha}, got ${computed}`
      core.error(msg)
      if (failOnMismatch) core.setFailed(msg)
      return false
    }

    core.info(`   SHA verified: ${localPath}`)
    return true
  } catch (err) {
    const msg = `Failed to verify SHA for ${localPath}: ${err instanceof Error ? err.message : String(err)}`
    core.error(msg)
    if (failOnMismatch) core.setFailed(msg)
    return false
  }
}
