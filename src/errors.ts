/*------------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as core from '@actions/core'

/**
 * Error handler, prints errors to the GitHub Actions console
 * and let's the action exit with exit code 1.
 *
 * @param {Error} error
 */
export function handleError(error: Error): void {
  const message = error.stack || error.message || String(error)
  core.setFailed(message)
  // No need to throw the error again, as the action is already failing.
  // Throwing can be used to satisfy execution paths, for example to make sure
  // that every path must either return a Promise<string> or throw an error.
}
