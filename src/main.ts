import * as core from '@actions/core'
import * as downloader from './downloader'
import * as input from './inputs'
import * as installer from './installer'
import * as platform from './platform'
import * as tc from '@actions/tool-cache'
import * as version_getter from './versiongetter'
import * as fs from 'fs'

function show_cache(): void {
  const testFolder = '/opt/hostedtoolcache/vulkan_sdk'
  fs.readdirSync(testFolder).forEach(file => {
    core.info(file)
  })
  core.info(`🔎 Show Cache`)
  const cachedVersions = tc.findAllVersions('vulkan_sdk', platform.OS_ARCH)
  if (cachedVersions.length !== 0) {
    core.info(`🎯 Cached versions of Vulkan SDK available: ${cachedVersions}`)
  }
}

async function get_vulkan_sdk(version: string, destination: string, use_cache: boolean): Promise<string> {
  let install_path: string
  let ver = await version_getter.resolve_version(version)
  if (use_cache) {
    show_cache()
    install_path = tc.find('vulkan_sdk', ver, platform.OS_ARCH)
    if (install_path) {
      core.info(`🎯 Found cached Vulkan SDK '${ver}' in path: ${install_path}`)
      core.addPath(install_path)
      return install_path
    }
  }
  const vulkan_sdk_path = await downloader.download_vulkan_sdk(ver)
  install_path = await installer.install_vulkan_sdk(vulkan_sdk_path, destination, ver)
  return install_path
}

async function get_vulkan_runtime(version: string, destination: string, use_cache: boolean): Promise<string> {
  let install_path: string
  let ver = await version_getter.resolve_version(version)
  if (use_cache) {
    show_cache()
    install_path = tc.find('vulkan_runtime', ver, platform.OS_ARCH)
    if (install_path) {
      core.info(`🎯 Found cached Vulkan Runtime '${ver}' in path: ${install_path}`)
      core.addPath(install_path)
      return install_path
    }
  }
  const vulkan_runtime_path = await downloader.download_vulkan_runtime(ver)
  install_path = await installer.install_vulkan_runtime(vulkan_runtime_path, destination)
  return install_path
}

async function run(): Promise<void> {
  try {
    const inputs: input.Inputs = await input.getInputs()

    const version = await version_getter.resolve_version(inputs.version)

    const sdk_path = await get_vulkan_sdk(version, inputs.destination, inputs.use_cache)

    const sdk_versionized_path = `${sdk_path}/${version}`

    core.addPath(`${sdk_versionized_path}`)
    core.info(`✔️ [PATH] Added path to Vulkan SDK to environment variable PATH.`)

    core.exportVariable('VULKAN_SDK', `${sdk_versionized_path}`)
    core.info(`✔️ [ENV] Set env variable VULKAN_SDK -> "${sdk_versionized_path}".`)

    core.exportVariable('VULKAN_VERSION', `${version}`)
    core.info(`✔️ [ENV] Set env variable VULKAN_VERSION -> "${version}".`)

    core.setOutput('VULKAN_VERSION', version)

    if (inputs.install_runtime /*&& platform.IS_WINDOWS*/) {
      const install_path = await get_vulkan_runtime(version, inputs.destination, inputs.use_cache)

      core.info(`✔️ [INFO] Path to Vulkan Runtime: ${install_path}`)
    }
  } catch (error: any) {
    let errorMessage = 'ErrorMessage'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    core.error(errorMessage)
  }
}

run()
