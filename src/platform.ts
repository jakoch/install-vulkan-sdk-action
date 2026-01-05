/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import * as os from 'node:os'
import * as fs from 'node:fs'

export const HOME_DIR: string = os.homedir() // $HOME
export const TEMP_DIR: string = os.tmpdir()

export const OS_PLATFORM: string = os.platform() // linux, mac, win32
export const OS_ARCH: string = os.arch() // x64, arm64

export const IS_WINDOWS: boolean = OS_PLATFORM === 'win32'
export const IS_LINUX: boolean = OS_PLATFORM === 'linux'
export const IS_MAC: boolean = OS_PLATFORM === 'darwin'

export const IS_WINDOWS_ARM: boolean = IS_WINDOWS && OS_ARCH === 'arm64'
export const IS_LINUX_ARM: boolean = IS_LINUX && OS_ARCH === 'arm64'

/**
 * Return a platform name, which can be used as part of the URLs.
 *
 * @export
 * @return {*}  {string} The plaform name (windows, mac, linux).
 */
export function getPlatform(): string {
  if (IS_WINDOWS_ARM) {
    // this needs to be before IS_WINDOWS
    return 'warm'
  } else if (IS_WINDOWS) {
    return 'windows'
  } else if (IS_MAC) {
    return 'mac'
  } else {
    return OS_PLATFORM
  }
}

/**
 * Determines the Linux distribution version.
 * This function helps to differentiate between Ubuntu "20.04" and "24.04".
 *
 * Alternative: source /etc/os-release ; echo -n "$VERSION_ID"
 *
 * @export
 */
export function getLinuxDistributionVersionId(): string {
  const osReleasePath = '/etc/os-release'
  if (fs.existsSync(osReleasePath)) {
    const osReleaseContent = fs.readFileSync(osReleasePath, 'utf8')
    const versionMatch = osReleaseContent.match(/VERSION_ID="(\d+\.\d+)"/)
    if (versionMatch) {
      return versionMatch[1]
    }
  }
  return ''
}
