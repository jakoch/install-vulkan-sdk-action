/*---------------------------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2025 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *--------------------------------------------------------------------------------------------*/

import * as core from '@actions/core'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as platform from './platform'
import * as archive from './archive'

/**
 * Install the Vulkan SDK.
 *
 * @export
 * @param {string} sdk_path - Path to the Vulkan SDK installer executable.
 * @param {string} destination - Installation destination path.
 * @param {string} version - Vulkan SDK version.
 * @param {string[]} optional_components - Array of optional components to install.
 * @return {*}  {Promise<string>} - Installation path.
 */
export async function installVulkanSdk(
  sdkPath: string,
  destination: string,
  version: string,
  optionalComponents: string[]
): Promise<string> {
  let installPath = ''

  core.info(`📦 Extracting Vulkan SDK...`)

  // changing the destination to a versionised folder, e.g. "/Users/runner/vulkan-sdk/1.4.304.0"
  const versionizedDestinationPath = path.normalize(`${destination}/${version}`)

  if (platform.IS_MAC) {
    // handle version dependend installation procedure change (dmg/zip)
    if (version <= '1.3.290.0') {
      // the sdk is a .dmg
      installPath = await installVulkanSdkMacDmg(sdkPath, versionizedDestinationPath, version, optionalComponents)
    } else {
      // the sdk is a .zip
      installPath = await installVulkanSdkMacZip(sdkPath, versionizedDestinationPath, version, optionalComponents)
    }
  } else if (platform.IS_LINUX || platform.IS_LINUX_ARM) {
    // the archive extracts a "1.3.250.1" top-level dir
    installPath = await installVulkanSdkLinux(sdkPath, destination, optionalComponents)
  } else if (platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) {
    installPath = await installVulkanSdkWindows(sdkPath, versionizedDestinationPath, optionalComponents)
  }

  core.info(`   Installed into folder: ${installPath}`)

  return installPath
}

/**
 * Install the Vulkan SDK on a Linux system.
 *
 * @export
 * @param {string} sdk_path - Path to the Vulkan SDK installer executable.
 * @param {string} destination - Installation destination path.
 * @param {string[]} optional_components - Array of optional components to install.
 * @return {*}  {Promise<string>} - Installation path.
 */
export async function installVulkanSdkLinux(
  sdkPath: string,
  destination: string,
  optionalComponents: string[]
): Promise<string> {
  const installPath = await archive.extract(sdkPath, destination)

  return installPath
}

/**
 * Install the Vulkan SDK on a MAC system (dmg).
 *
 * https://vulkan.lunarg.com/doc/sdk/1.4.304.0/mac/getting_started.html
 *
 * package type changed (dmg to zip)
 * vulkan sdk was packaged as a .dmg (disk image) up to version 1.3.290.0.
 * vulkan sdk is packaged as a .zip since version 1.3.296.0.
 *
 * @export
 * @param {string} sdk_path - Path to the Vulkan SDK installer executable.
 * @param {string} destination - Installation destination path.
 * @param {string} version - Vulkan SDK version.
 * @param {string[]} optional_components - Array of optional components to install.
 * @return {*}  {Promise<string>} - Installation path.
 */
export async function installVulkanSdkMacDmg(
  sdkPath: string,
  destination: string,
  version: string,
  optionalComponents: string[]
): Promise<string> {
  // mount the dmg (disk image)
  const mountCmd = `hdiutil attach ${sdkPath} -mountpoint /Volumes/vulkan-sdk`
  await execSync(mountCmd)

  //core.debug(`Command: ${mountCmd}`)
  //const mountOutput = await execSync(mountCmd)
  //core.debug(`Output: ${mountOutput}`)

  //const lsOutput = await execSync(`ls -la /Volumes/vulkan-sdk`)
  //core.debug(`Output: ${lsOutput}`)

  // The full CLI command looks like:
  // sudo /InstallVulkan.app/Contents/MacOS/InstallVulkan --root "installation path" --accept-licenses --default-answer --confirm-command install
  const cmdArgs = [
    '--root',
    destination,
    '--accept-licenses',
    '--default-answer',
    '--confirm-command',
    'install',
    ...optionalComponents
  ]
  const installerArgs = cmdArgs.join(' ')

  const installer = getInstallerNameMac(version)

  const runAsAdminCmd = `sudo /Volumes/vulkan-sdk/${installer} ${installerArgs}`

  core.debug(`Command: ${runAsAdminCmd}`)

  try {
    await execSync(runAsAdminCmd)
    //let stdout: string = execSync(run_as_admin_cmd, {stdio: 'inherit'}).toString().trim()
    //process.stdout.write(stdout)
  } catch (error) {
    if (error instanceof Error) {
      core.error(error.message)
    } else {
      core.error('An unknown error occurred.')
    }
    core.setFailed(`Installer failed. Arguments used: ${installerArgs}`)
  }

  // unmount the disk image on CI?
  await execSync(`hdiutil detach -force /Volumes/vulkan-sdk`)

  return destination
}

/**
 * Install the Vulkan SDK on a MAC system (zip).
 *
 * https://vulkan.lunarg.com/doc/sdk/1.4.304.0/mac/getting_started.html
 *
 * vulkan sdk was packaged as a .dmg (disk image) up to version 1.3.290.0.
 * vulkan sdk is packaged as a .zip since version 1.3.296.0.
 *
 * @export
 * @param {string} sdk_path - Path to the Vulkan SDK installer executable.
 * @param {string} destination - Installation destination path.
 * @param {string} version - Vulkan SDK version.
 * @param {string[]} optional_components - Array of optional components to install.
 * @return {*}  {Promise<string>} - Installation path.
 */
export async function installVulkanSdkMacZip(
  sdkPath: string,
  destination: string,
  version: string,
  optionalComponents: string[]
): Promise<string> {
  // vulkan sdk is packaged as a .zip since version 1.3.296.0
  // extract the zip archive to /tmp
  await archive.extract(sdkPath, platform.TEMP_DIR)

  // The full CLI command looks like:
  // sudo ./InstallVulkan.app/Contents/MacOS/InstallVulkan --root "installation path" --accept-licenses --default-answer --confirm-command install
  const cmdArgs = [
    '--root',
    destination,
    '--accept-licenses',
    '--default-answer',
    '--confirm-command',
    'install',
    ...optionalComponents
  ]
  const installerArgs = cmdArgs.join(' ')

  const installer = getInstallerNameMac(version)

  const runAsAdminCmd = `sudo ${platform.TEMP_DIR}/${installer} ${installerArgs}`

  core.debug(`Command: ${runAsAdminCmd}`)

  try {
    await execSync(runAsAdminCmd)
    //let stdout: string = execSync(run_as_admin_cmd, {stdio: 'inherit'}).toString().trim()
    //process.stdout.write(stdout)
  } catch (error) {
    if (error instanceof Error) {
      core.error(error.message)
    } else {
      core.error('An unknown error occurred.')
    }
    core.setFailed(`Installer failed. Arguments used: ${installerArgs}`)
  }

  return destination
}

/**
 * Get the installer name for the Vulkan SDK on MacOS.
 * The installer name is version dependent.
 *
 * The app name changed from an unversionised to versionised.
 * - up to version 1.4.304.0: "/InstallVulkan.app/Contents/MacOS/InstallVulkan"
 * - since version 1.4.304.1: "/InstallVulkan-${version}.app/Contents/MacOS/InstallVulkan-${version}"
 * - since version 1.4.313.0: "/vulkansdk-macOS-${version}.app/Contents/MacOS/vulkansdk-macOS-${version}"
 *
 * @param {string} version - The version of the Vulkan SDK.
 * @return {*}  {string} - The installer name.
 */
function getInstallerNameMac(version: string): string {
  let installer = ''
  if (version <= '1.4.304.0') {
    installer = `InstallVulkan.app/Contents/MacOS/InstallVulkan`
  } else if (version >= '1.4.304.1' && version < '1.4.313.0') {
    installer = `InstallVulkan-${version}.app/Contents/MacOS/InstallVulkan-${version}`
  } else if (version >= '1.4.313.0') {
    installer = `vulkansdk-macOS-${version}.app/Contents/MacOS/vulkansdk-macOS-${version}`
  }
  return installer
}

/**
 * Install the Vulkan SDK on a Windows system.
 *
 * @export
 * @param {string} sdk_path- Path to the Vulkan SDK installer executable.
 * @param {string} destination - Installation destination path.
 * @param {string[]} optional_components - Array of optional components to install.
 * @return {*}  {Promise<string>} - Installation path.
 */
export async function installVulkanSdkWindows(
  sdkPath: string,
  destination: string,
  optionalComponents: string[]
): Promise<string> {
  // Warning: The installation path cannot be relative, please specify an absolute path.
  // Changing the destination to a versionzed folder "C:\VulkanSDK\1.3.250.1"

  const cmdArgs = [
    '--root',
    destination,
    '--accept-licenses',
    '--default-answer',
    '--confirm-command',
    'install',
    ...optionalComponents
  ]
  const installerArgs = cmdArgs.join(' ')

  //
  // The full CLI command looks like:
  //
  // powershell.exe Start-Process
  //  -FilePath 'C:\Users\RUNNER~1\AppData\Local\Temp\VulkanSDK-Installer.exe'
  //  -Args '--root C:\VulkanSDK\1.3.250.1 --accept-licenses --default-answer --confirm-command install com.lunarg.vulkan.vma com.lunarg.vulkan.volk'
  //  -Verb RunAs
  //  -Wait
  //
  // Alternative: "$installer = Start-Process ... -PassThru" and "$installer.WaitForExit();"
  //
  // Important:
  // 1. The installer must be run as administrator.
  // 2. Keep the "-Wait", because the installer process needs to finish writing all files and folders before we can proceed.
  const runAsAdminCmd = `powershell.exe Start-Process -FilePath '${sdkPath}' -Args '${installerArgs}' -Verb RunAs -Wait`

  core.debug(`Command: ${runAsAdminCmd}`)

  try {
    await execSync(runAsAdminCmd)
    //let stdout: string = execSync(run_as_admin_cmd, {stdio: 'inherit'}).toString().trim()
    //process.stdout.write(stdout)
  } catch (error) {
    if (error instanceof Error) {
      core.error(error.message)
    } else {
      core.error('An unknown error occurred.')
    }
    core.setFailed(`Installer failed. Arguments used: ${installerArgs}`)
  }

  return destination
}

/**
 * Install the Vulkan Runtime
 *
 * @export
 * @param {string} runtime_path
 * @param {string} destination
 * @param {string} version
 * @return {*}  {Promise<string>}
 */
export async function installVulkanRuntime(runtimePath: string, destination: string, version: string): Promise<string> {
  /*
   Problem: extracting the zip would create a top-level folder,
   e.g.  "C:\VulkanSDK\runtime\VulkanRT-1.3.250.1-Components\".
   So, let's extract the contents of the ZIP archive to a temporary directory,
   and then copy the contents of the top-level folder within the temp dir
   to the runtime_destination without the top-level folder itself.
   Goal is to have: C:\VulkanSDK\runtime\x64\vulkan-1.dll
  */
  core.info(`📦 Extracting Vulkan Runtime (➔ vulkan-1.dll) ...`)
  // install into temp
  const tempInstallPath = path.normalize(`${platform.TEMP_DIR}/vulkan-runtime`) // C:\Users\RUNNER~1\AppData\Local\Temp\vulkan-runtime
  await archive.extract(runtimePath, tempInstallPath)
  await wait(3000) // wait/block for 3sec for files to arrive. ugly hack.
  // copy from temp to destination
  const topLevelFolder = fs.readdirSync(tempInstallPath)[0] // VulkanRT-1.3.250.1-Components
  const tempTopLevelFolderPath = path.join(tempInstallPath, topLevelFolder) // C:\Users\RUNNER~1\AppData\Local\Temp\vulkan-runtime\VulkanRT-1.3.250.1-Components
  const installPath = path.normalize(`${destination}/${version}/runtime`) // C:\VulkanSDK\1.3.250.1\runtime
  copyFolder(tempTopLevelFolderPath, installPath)
  fs.rmSync(tempInstallPath, { recursive: true })
  core.info(`   Installed into folder: ${installPath}`)
  return installPath
}

/**
 * Get the path to the "vulkaninfo" executable.
 * The path is platform dependent.
 *
 * Windows:   "C:\VulkanSDK\bin\vulkaninfoSDK.exe"
 * Linux:     "/usr/vulkan-sdk/1.2.3.4/x86_64/bin/vulkaninfo"
 * MacOS:     "/usr/vulkan-sdk/1.2.3.4/macOS/bin/vulkaninfo"
 * Linux ARM: "/usr/vulkan-sdk/1.2.3.4/aarch64/bin/vulkaninfo"
 *
 * @param {string} sdk_install_path - The installation path of the Vulkan SDK, e.g. "C:\VulkanSDK\1.2.3.4\x86_64".
 * @return {*}  {string}
 * @export
 */
export function getVulkanInfoPath(sdkInstallPath: string): string {
  if (platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) {
    return path.join(sdkInstallPath, 'bin/vulkaninfoSDK.exe')
  }
  if (platform.IS_LINUX || platform.IS_LINUX_ARM) {
    return path.join(sdkInstallPath, 'bin/vulkaninfo')
  }
  if (platform.IS_MAC) {
    return path.join(sdkInstallPath, 'bin/vulkaninfo')
  }
  return path.join(sdkInstallPath, 'bin/vulkaninfo')
}

/**
 * Get the path to Vulkan SDK with version and target architecture.
 * The path is platform dependent.
 *
 * Windows:   "C:\VulkanSDK\"
 * Linux:     "/usr/vulkan-sdk/1.2.3.4/x86_64/"
 * MacOS:     "/usr/vulkan-sdk/1.2.3.4/macOS/"
 * Linux ARM: "/usr/vulkan-sdk/1.2.3.4/aarch64/"
 *
 * @param {string} sdk_path - The installation path of the Vulkan SDK, e.g. "C:\VulkanSDK\
 * @param {string} version - The version of the Vulkan SDK
 * @return {*}  {string}
 * @export
 */
export function getVulkanSdkPath(sdkPath: string, version: string): string {
  // let install_path be a versionized path to the SDK
  let installPath = sdkPath
  if (!sdkPath.includes(version)) {
    installPath = path.join(sdkPath, version)
  }

  // let install_path contain the target architecture (x86_64, aarch64)
  if (platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) {
    // windows has no target architecture, its just "C:\VulkanSDK\1.4.304.0\bin"
    // install_path is a versionized path, fallthrough
  }
  // note: LINUX_ARM must be checked before LINUX
  else if (platform.IS_LINUX_ARM) {
    installPath = path.join(installPath, 'aarch64')
  } else if (platform.IS_LINUX) {
    installPath = path.join(installPath, 'x86_64')
  } else if (platform.IS_MAC) {
    installPath = path.join(installPath, 'macOS')
  }

  // lets check if the path with version and target arch exists
  if (!fs.existsSync(installPath)) {
    core.warning(`Vulkan SDK path doesn't exist: ${installPath}`)
  }

  return installPath
}

/**
 * Verify the installation of the SDK.
 *
 * The verification is done by checking the existence of the "vulkaninfo" executable.
 *
 * @export
 * @param {string} sdk_install_path - The installation path of the Vulkan SDK, e.g. "C:\VulkanSDK\1.3.250.1\x86_x64".
 * @return {*}  {boolean}
 */
export function verifyInstallationOfSdk(sdkInstallPath: string): boolean {
  let r = false
  const file = getVulkanInfoPath(sdkInstallPath)
  r = fs.existsSync(file)
  return r
}

/**
 * Run the vulkaninfo command.
 *
 * Runs the "vulkaninfo --summary" command, if it exists.
 * and log the output in a collapsible section in the workflow logs.
 *
 * @param {string} vulkanInfoPath - The path to the "vulkaninfo" executable.
 */
export function runVulkanInfo(vulkanInfoPath: string): void {
  if (fs.existsSync(vulkanInfoPath)) {
    core.startGroup(`Vulkan Info Summary`)
    const runVulkanInfoCmd = `${vulkanInfoPath} --summary`
    try {
      const stdout: string = execSync(runVulkanInfoCmd).toString().trim()
      process.stdout.write(stdout)
    } catch (error) {
      if (error instanceof Error) {
        core.error(error.message)
      } else {
        core.error('An unknown error occurred while running vulkaninfo.')
      }
    }
    core.endGroup()
  } else {
    core.warning(`vulkaninfo executable not found at path: ${vulkanInfoPath}`)
  }
}

/**
 * Verify the installation of the Vulkan Runtime.
 *
 * @export
 * @param {string} sdk_install_path - The installation path of the Vulkan SDK, e.g. "C:\VulkanSDK\1.3.250.1".
 * @param {string} version - The version of the Vulkan SDK.
 * @return {*}  {boolean}
 */
export function verifyInstallationOfRuntime(sdkInstallPath: string, version: string): boolean {
  let r = false
  if (platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) {
    let file = ''
    if (version <= '1.4.309.0') {
      file = `${sdkInstallPath}/runtime/x64/vulkan-1.dll`
    } else if (version > '1.4.309.0') {
      file = `${sdkInstallPath}/runtime/vulkan-1.dll`
    }
    r = fs.existsSync(file)
  }
  return r
}

/**
 * Stripdown the installation of the Vulkan SDK (only windows).
 * This reduces the size of the SDK before caching.
 * It removes superflous files given the CI context this action runs in,
 * e.g. removing demos and removing the maintainance-tool.exe.
 *
 * @export
 * @param {string} sdk_install_path - The installation path of the Vulkan SDK, e.g. "C:\VulkanSDK\1.3.250.1".
 */
export function stripdownInstallationOfSdk(sdkInstallPath: string): void {
  if (platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) {
    core.info(`✂ Reducing Vulkan SDK size before caching`)
    let foldersToDelete: string[] = []
    foldersToDelete = [
      `${sdkInstallPath}\\Demos`,
      `${sdkInstallPath}\\Helpers`,
      `${sdkInstallPath}\\installerResources`,
      `${sdkInstallPath}\\Licenses`,
      `${sdkInstallPath}\\Templates`
      // old installers had
      //`${sdk_install_path}\\Bin32`,
      //`${sdk_install_path}\\Tools32`,
      //`${sdk_install_path}\\Lib32`,
    ]
    removeFoldersIfExist(foldersToDelete)

    // this deletes the files in the top-level folder
    // e.g. maintenancetool.exe, installer.dat, network.xml
    // which saves around ~25MB
    deleteFilesInFolder(sdkInstallPath)
  }
}
/**
 * Remove one folder, if existing.
 *
 * @param {string} folder - The folder to remove.
 * @return {*}  {boolean}
 */
function removeFolderIfExists(folder: string): boolean {
  try {
    if (fs.existsSync(folder)) {
      fs.rmSync(folder, { recursive: true })
      core.info(`Deleted folder: ${folder}`)
      return true
    } else {
      core.info(`Folder ${folder} doesn't exist.`)
    }
  } catch (error) {
    console.error(`Error removing folder: ${error}`)
  }

  return false
}
/**
 * Remove multiple folders, if existing.
 *
 * @param {string[]} folders - The folders to remove.
 */
function removeFoldersIfExist(folders: string[]): void {
  for (const folder of folders) {
    removeFolderIfExists(folder)
  }
}

function deleteFilesInFolder(folder: string): void {
  for (const file of fs.readdirSync(folder)) {
    const filePath = path.join(folder, file)
    if (fs.statSync(filePath).isDirectory()) {
      // biome-ignore lint/correctness/noUnnecessaryContinue: If subdirectory, skip it
      continue
    } else {
      // If file, delete it
      fs.unlinkSync(filePath)
      core.info(`Deleted file: ${filePath}`)
    }
  }
}
/**
 * Copy a folder.
 *
 * @param {string} from
 * @param {string} to
 */
function copyFolder(from: string, to: string) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true })
  }
  for (const element of fs.readdirSync(from)) {
    if (fs.lstatSync(path.join(from, element)).isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element))
    } else {
      copyFolder(path.join(from, element), path.join(to, element))
    }
  }
}
/**
 * Wait a bit...
 *
 * @param {number} [timeout=2000]
 * @return {*}
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
