import * as os from 'os'

export const HOME_DIR: string = os.homedir() // $HOME

export const OS_PLATFORM: string = os.platform() // linux, mac, win32
export const OS_ARCH: string = os.arch()

export const IS_WINDOWS: boolean = OS_PLATFORM === 'win32'
export const IS_LINUX: boolean = OS_PLATFORM === 'linux'
export const IS_MAC: boolean = OS_PLATFORM === 'darwin'

export const TEMP_DIR: string = os.tmpdir()

// this needs to return a platform name, which can be used as part of the URLs
export function getPlatform(): string {
  if (IS_WINDOWS) {
    // win32 => windows
    return 'windows'
  }
  if (IS_MAC) {
    // darwin => mac
    return 'mac'
  }
  return OS_PLATFORM
}
