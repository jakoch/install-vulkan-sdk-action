/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as tc from '@actions/tool-cache'
import * as platform from './platform'

/**
 * Extracts an archive file to a specified destination based on the platform and file type.
 *
 * @param {string} file - The path to the archive file to be extracted.
 * @param {string} destination - The destination directory where the archive contents will be extracted.
 * @return {*}  {Promise<string>} A Promise that resolves to the destination directory path after extraction.
 */
export async function extract(file: string, destination: string): Promise<string> {
  if (platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) {
    if (file.endsWith('.exe')) {
      return destination // No extraction needed for .exe files
    } else if (file.endsWith('.zip')) {
      return await tc.extractZip(file, destination)
    } else if (file.endsWith('.7z')) {
      return await tc.extract7z(file, destination)
    }
    throw new Error(`The file type is unsupported: ${file}`)
  } else if (platform.IS_MAC) {
    if (file.endsWith('.dmg')) {
      return destination // No extraction needed for .dmg files, we just mount them
    } else if (file.endsWith('.zip')) {
      return await tc.extractZip(file, destination)
    }
    throw new Error(`The file type is unsupported: ${file}`)
  } else if (platform.IS_LINUX || platform.IS_LINUX_ARM) {
    if (file.endsWith('.tar.gz')) {
      // extractTar defaults to 'xz' (extracting gzipped tars / gzip).
      return await tc.extractTar(file, destination)
    } else if (file.endsWith('.tar.xz')) {
      // Flag Usage:
      // https://www.man7.org/linux/man-pages/man1/tar.1.html
      // -J or --xz = filter archive through xz
      // -x for extract
      // note: ".tar.bz2" is "-xj"
      return await tc.extractTar(file, destination, ['-xJ'])
    }
    throw new Error(`The file type is unsupported: ${file}`)
  }
  throw new Error(`Unsupported platform: ${platform.OS_PLATFORM}`)
}
