import * as core from '@actions/core'
import * as fs from 'fs'
import * as platform from './platform'
import * as tc from '@actions/tool-cache'
import {exec} from '@actions/exec'

export async function install_vulkan_sdk(sdk_path: string, destination: string, version: string): Promise<string> {
  let install_path = ''

  core.info(`📦 Extracting Vulkan SDK...`)
  core.info(`    File: ${sdk_path}`)

  if (platform.IS_MAC) {
    // TODO
  }

  if (platform.IS_LINUX) {
    install_path = await extract_archive(sdk_path, destination)
    const cachedPath = await tc.cacheDir(install_path, 'vulkan_sdk', version, platform.OS_ARCH)
    core.addPath(cachedPath)
  }

  if (platform.IS_WINDOWS) {
    // TODO allow installing optional components
    // --confirm-command install com.lunarg.vulkan.32bit
    //                           com.lunarg.vulkan.thirdparty
    //                           com.lunarg.vulkan.debug
    //                           com.lunarg.vulkan.debug32
    const exitCode = await exec(sdk_path, [
      '--root',
      destination,
      '--accept-licenses',
      '--default-answer',
      '--confirm-command install'
    ])
    if (exitCode !== 0) {
      core.setFailed('Failed to run ${sdk_installer_filepath}.')
    } else {
      install_path = destination
    }
  }
  return install_path
}

export async function install_vulkan_runtime(runtime_archive_filepath: string, destination: string): Promise<string> {
  core.info(`📦 Extracting Vulkan Runtime...`)
  const runtime_destination = `${destination}/runtime`
  const install_path = extract_archive(runtime_archive_filepath, runtime_destination)
  return install_path
}

async function extract_archive(file: string, destination: string): Promise<string> {
  const extract = tc.extractTar
  if (platform.IS_WINDOWS) {
    if (file.endsWith('.exe')) {
      return destination
    } else if (file.endsWith('.zip')) {
      const extract = tc.extractZip
    } else if (file.endsWith('.7z')) {
      const extract = tc.extract7z
    }
  } else if (platform.IS_MAC) {
    const extract = tc.extractXar
  } else {
    const extract = tc.extractTar
  }
  return await extract(file, destination)
}

async function verify_installation_of_sdk(sdk_path?: string): Promise<number> {
  let exitCode = 1

  if (platform.IS_LINUX || platform.IS_MAC) {
    exitCode = await exec(`${sdk_path}/bin/vulkaninfo`)
    core.info(`vulkaninfo exitCode: ${exitCode}!`)
  }
  if (platform.IS_WINDOWS) {
    exitCode = await exec(`${sdk_path}/bin/vulkaninfoSDK.exe`)
    core.info(`vulkaninfoSDK.exe exitCode: ${exitCode}!`)
  }

  if (exitCode !== 0) {
    core.setFailed('Failed to run vulkaninfo.')
  }
  return exitCode
}

function verify_installation_of_runtime(sdk_path?: string): number {
  if (platform.IS_WINDOWS) {
    return fs.existsSync(`${sdk_path}/runtime/vulkan-1.dll`) ? 1 : 0
  }
  return 0
}
