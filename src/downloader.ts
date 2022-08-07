import * as core from '@actions/core'
import * as http from './http'
import * as path from 'path'
import * as platform from './platform'
import * as tc from '@actions/tool-cache' // https://github.com/actions/toolkit/tree/main/packages/tool-cache

// Returns the download url
// The url is already checked, if available (HTTP 200).
export async function get_url_vulkan_sdk(version: string): Promise<string> {
  const platformName = platform.getPlatform()

  // For download urls see https://vulkan.lunarg.com/sdk/home

  // Windows:
  // Latest Version: https://sdk.lunarg.com/sdk/download/latest/windows/vulkan-sdk.exe
  // Versionized:    https://sdk.lunarg.com/sdk/download/1.3.216.0/windows/VulkanSDK-1.3.216.0-Installer.exe

  const DOWNLOAD_BASE_URL = `https://sdk.lunarg.com/sdk/download/${version}/${platformName}`

  let VULKAN_SDK_URL = ''

  if (platform.IS_WINDOWS) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/VulkanSDK-${version}-Installer.exe`
  }
  if (platform.IS_LINUX) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/vulkansdk-linux-x86_64-${version}.tar.gz`
  }
  if (platform.IS_MAC) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/vulkansdk-macos-${version}.dmg`
  }

  is_downloadable('VULKAN_SDK', version, VULKAN_SDK_URL)

  return VULKAN_SDK_URL
}

// vulkan-runtime-components is a windows specific download shipping "vulkan-1.dll" for x86 and x64.
export async function get_url_vulkan_runtime(version: string): Promise<string> {
  // Windows:
  // Latest Version:  https://sdk.lunarg.com/sdk/download/latest/windows/vulkan-runtime-components.zip
  // Versionized:     https://sdk.lunarg.com/sdk/download/1.3.216.0/windows/VulkanRT-1.3.216.0-Components.zip
  const VULKAN_RUNTIME_URL = `https://sdk.lunarg.com/sdk/download/${version}/windows/vulkan-runtime-components.zip`
  is_downloadable('VULKAN_RUNTIME', version, VULKAN_RUNTIME_URL)
  return VULKAN_RUNTIME_URL
}

async function is_downloadable(name: string, version: string, url: string) {
  try {
    const HttpClientResponse = await http.client.head(url)
    const statusCode = HttpClientResponse.message.statusCode
    if (statusCode !== undefined && statusCode >= 400) {
      core.setFailed(`❌ ${name} version not found: ${version} using URL: ${url}`)
    }
    core.info(`✔️ The requested ${name} version was found: ${version}`)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

export async function download_vulkan_sdk(version: string): Promise<string> {
  core.info(`🔽 Downloading Vulkan SDK ${version}`)
  const url = await get_url_vulkan_sdk(version)
  core.info(`    URL: ${url}`)
  const sdk_path = await tc.downloadTool(url, path.join(platform.TEMP_DIR, get_vulkan_sdk_filename()))
  core.info(`✔️ Download completed successfully!`)
  core.info(`   File: ${sdk_path}`)
  return sdk_path
}

// windows only
export async function download_vulkan_runtime(version: string): Promise<string> {
  core.info(`🔽 Downloading Vulkan Runtime ${version}`)
  const url = await get_url_vulkan_runtime(version)
  core.info(`   URL: ${url}`)
  const runtime_path = await tc.downloadTool(url, path.join(platform.TEMP_DIR, `vulkan-runtime-components.zip`))
  core.info(`✔️ Download completed successfully!`)
  core.info(`    File: ${runtime_path}`)
  return runtime_path
}

export function get_vulkan_sdk_filename(): string {
  if (platform.IS_WINDOWS) {
    return `VulkanSDK-Installer.exe`
  }
  if (platform.IS_LINUX) {
    return `vulkansdk-linux-x86_64.tar.gz`
  }
  if (platform.IS_MAC) {
    return `vulkansdk-macos.dmg`
  }
  return 'not-implemented-for-platform'
}
