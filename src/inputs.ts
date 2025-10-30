/*---------------------------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2025 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *--------------------------------------------------------------------------------------------*/

import * as core from '@actions/core'
import * as path from 'node:path'
import * as platform from './platform'
import * as versionsVulkan from './versions_vulkan'

/**
 * List of available Input arguments
 *
 * @export
 * @interface Inputs
 */
export interface Inputs {
  // Vulkan SDK inputs
  version: string
  destination: string
  installRuntime: boolean
  installRuntimeOnly: boolean
  useCache: boolean
  optionalComponents: string[]
  stripdown: boolean
  // SwiftShader inputs
  installSwiftshader: boolean
  swiftshaderDestination: string
  // Lavapipe inputs
  installLavapipe: boolean
  lavapipeDestination: string
}

/**
 * Handles the incomming arguments for the action.
 *
 * If an input argument requires validation beyond a simple boolean check,
 * individual getter functions are used for incoming argument validation.
 *
 * @export
 * @return {*}  {Promise<Inputs>}
 */
export async function getInputs(): Promise<Inputs> {
  // Vulkan SDK raw inputs
  // This is intentionally "vulkan_version" and not only "version" to avoid
  // unexpected behavior due to naming conflicts with environment variables.
  // VERSION is often set to env for artifact names.
  const inputVulkanVersion = core.getInput('vulkan_version', { required: false })
  const inputDestination = core.getInput('destination', { required: false })
  const inputInstallRuntime = core.getInput('install_runtime', { required: false })
  const inputInstallRuntimeOnly = core.getInput('install_runtime_only', { required: false })
  const inputUseCache = core.getInput('cache', { required: false })
  const inputOptionalComponents = core.getInput('optional_components', { required: false })
  const inputStripdown = core.getInput('stripdown', { required: false })

  // SwiftShader raw inputs
  const inputInstallSwiftshader = core.getInput('install_swiftshader', { required: false })
  const inputSwiftshaderDestination = core.getInput('swiftshader_destination', { required: false })
  //const inputSwiftshaderVersion = core.getInput('swiftshader_version', { required: false })

  // Lavapipe raw inputs
  const inputInstallLavapipe = core.getInput('install_Lavapipe', { required: false })
  const inputLavapipeDestination = core.getInput('lavapipe_destination', { required: false })
  //const inputLavapipeVersion = core.getInput('Lavapipe_version', { required: false })

  const inputs = {
    // Vulkan SDK inputs
    version: await getInputVulkanVersion(inputVulkanVersion),
    destination: await getInputVulkanDestination(inputDestination),
    installRuntime: /true/i.test(inputInstallRuntime),
    installRuntimeOnly: /true/i.test(inputInstallRuntimeOnly),
    useCache: /true/i.test(inputUseCache),
    optionalComponents: await getInputVulkanOptionalComponents(inputOptionalComponents),
    stripdown: /true/i.test(inputStripdown),

    // SwiftShader inputs
    installSwiftshader: /true/i.test(inputInstallSwiftshader),
    swiftshaderDestination: await getInputSwiftshaderDestination(inputSwiftshaderDestination),
    //swiftshaderVersion: await getInputSwiftshaderVersion(inputSwiftshaderVersion),
    //swiftshaderVersionExplicit: inputSwiftshaderVersion !== '', // used for implicit conditions

    // Lavapipe inputs
    installLavapipe: /true/i.test(inputInstallLavapipe),
    lavapipeDestination: await getInputLavapipeDestination(inputLavapipeDestination)
    //LavapipeVersion: await getIputLavapipeVersion(inputLavapipeVersion),
    //LavapipeVersionExplicit: inputLavapipeVersion !== '' // used for implicit conditions
  }

  // Apply implicit conditions

  // When the user wants to install only the runtime, implicitly enable the runtime installation.
  // In this case the user doesn't have to set both flags in his workflow step.
  if (inputs.installRuntimeOnly) {
    inputs.installRuntime = true
  }

  // If a swiftshader_version was explicitly set, install SwiftShader
  /*if (!inputs.installSwiftshader && inputs.swiftshaderVersionExplicit) {
    inputs.installSwiftshader = true
  }*/

  // If a Lavapipe_version was explicitly set, install Lavapipe
  /*if (!inputs.installLavapipe && inputs.LavapipeVersionExplicit) {
    inputs.installLavapipe = true
  }*/

  return inputs
}

/**
 * GetInputVersion validates the "version" argument.
 * If "vulkan_version" was not set or is empty, assume "latest" version.
 *
 * @export
 * @param {string} requested_version
 * @return {*}  {Promise<string>}
 */
export async function getInputVulkanVersion(requestedVersion: string): Promise<string> {
  // the user didnt provide a version, so we need to set one
  // if "vulkan_version" was not set or is empty, assume "latest" version
  if (requestedVersion === '') {
    requestedVersion = 'latest'
    return requestedVersion
  }

  // the user provided a version, so we need to validate it
  // throw error, if requestedVersion is a crappy version number
  if (!requestedVersion && !validateVersion(requestedVersion)) {
    const availableVersions = await versionsVulkan.getAvailableVersions()
    const versions = JSON.stringify(availableVersions, null, 2)

    throw new Error(
      `Invalid format of "vulkan_version: (${requestedVersion}").
       Please specify a version using the format 'major.minor.build.rev'.
       The following versions are available: ${versions}.`
    )
  }

  return requestedVersion
}

/**
 * Validates a version number to conform with the
 * "major.minor.patch.revision" ("1.2.3.4") versioning scheme.
 *
 * @export
 * @param {string} version
 * @return {*}  {boolean}
 */
export function validateVersion(version: string): boolean {
  const re = /^\d+\.\d+\.\d+\.\d+$/
  return re.test(version)
}

/**
 * getInputDestination validates the "destination" argument.
 *
 * @param {string} destination
 * @return {string} string
 */
export function getInputVulkanDestination(destination: string): string {
  // the user didnt provide a destination, so we need to set one
  // return default install locations for platform
  if (!destination || destination === '') {
    if (platform.IS_WINDOWS || platform.IS_WINDOWS_ARM) {
      destination = `C:\\VulkanSDK\\`
    }
    // The .tar.gz file extracts the SDK into a versionized directory of the form 1.x.y.z.
    // The official docs install into the "~" ($HOME) folder.
    if (platform.IS_LINUX || platform.IS_LINUX_ARM) {
      destination = `${platform.HOME_DIR}/vulkan-sdk`
    }
    // The macOS SDK is intended to be installed anywhere the user can place files such as the user's $HOME directory.
    if (platform.IS_MAC) {
      destination = `${platform.HOME_DIR}/vulkan-sdk`
    }
  }

  // the user provided a destination, so we need to normalize it
  destination = path.normalize(destination)

  core.debug(`vulkansdk_destination: ${destination}`)

  return destination
}

/**
 * getInputVulkanOptionalComponents validates the "optional_components" argument.
 *
 * https://vulkan.lunarg.com/doc/view/latest/windows/getting_started.html#user-content-installing-optional-components
 * list components on windows: "maintenancetool.exe list" or "installer.exe search"
 *
 * @export
 * @param {string} optional_components
 * @return {*}  {string[]}
 */
export function getInputVulkanOptionalComponents(optionalComponents: string): string[] {
  // the user didnt provide any optional components
  if (!optionalComponents) {
    return []
  }

  // the user provided optional components, so we need to validate them
  // against an allowlist of components

  const optionalComponentsAllowlist: string[] = [
    'com.lunarg.vulkan.32bit',
    'com.lunarg.vulkan.sdl2',
    'com.lunarg.vulkan.glm',
    'com.lunarg.vulkan.volk',
    'com.lunarg.vulkan.vma',
    'com.lunarg.vulkan.debug32',
    'com.lunarg.vulkan.arm64',
    'com.lunarg.vulkan.x64',
    // components of old installers
    'com.lunarg.vulkan.thirdparty',
    'com.lunarg.vulkan.debug'
  ]

  const inputComponents: string[] = optionalComponents
    .split(',')
    .map((item: string) => item.trim())
    .filter(Boolean)

  const invalidInputComponents: string[] = inputComponents.filter(
    item => optionalComponentsAllowlist.includes(item) === false
  )
  if (invalidInputComponents.length) {
    core.info(`❌ Please remove the following invalid optional_components: ${invalidInputComponents}`)
  }

  const validInputComponents: string[] = inputComponents.filter(
    item => optionalComponentsAllowlist.includes(item) === true
  )
  if (validInputComponents.length) {
    core.info(`✔️ Installing Optional Components: ${validInputComponents}`)
  }

  return validInputComponents
}

/**
 * getInputSwiftshaderDestination validates the "swiftshader_destination" argument.
 *
 * @param {string} destination
 * @return {*}  {Promise<string>}
 */
function getInputSwiftshaderDestination(destination: string): string {
  // return default install locations for platform
  if (!destination || destination === '') {
    if (platform.IS_WINDOWS) {
      destination = `C:\\Swiftshader\\`
    }
    if (platform.IS_LINUX) {
      destination = `${platform.HOME_DIR}/swiftshader`
    }
    if (platform.IS_MAC) {
      destination = `${platform.HOME_DIR}/swiftshader`
    }
  }
  destination = path.normalize(destination)

  core.debug(`swiftshader_destination: ${destination}`)

  return destination
}

/**
 * getInputSwiftshaderVersion validates the "swiftshader_version" argument.
 * If "swiftshader_version" was not set or is empty, assume "latest" version.
 *
 * @export
 * @param {string} requested_version
 * @return {*}  {Promise<string>}
 */
/*async function getInputSwiftshaderVersion(requested_version: string): Promise<string> {
  // if "swiftshader_version" was not set or is empty, assume "latest" version
  if (requested_version === '') {
    return 'latest'
  }

  // throw error, if requestedVersion is a crappy version number
  if (!requested_version && !validateVersion(requested_version)) {
    const availableVersions = await version_getter.get_versions_swiftshader()
    const versions = JSON.stringify(availableVersions, null, 2)

    throw new Error(
      `Invalid format of "swiftshader_version: (${requested_version}").
         Please specify a version using the format 'major.minor.build.rev'.
         The following versions are available: ${versions}.`
    )
  }

  return requested_version
}*/

/**
 * getInputLavapipeDestination validates the "lavapipe_destination" argument.
 *
 * @param {string} destination
 * @return {*}  {Promise<string>}
 */
function getInputLavapipeDestination(destination: string): string {
  // return default install locations for platform
  if (!destination || destination === '') {
    if (platform.IS_WINDOWS) {
      destination = `C:\\Lavapipe\\`
    }
    if (platform.IS_LINUX) {
      destination = `${platform.HOME_DIR}/lavapipe`
    }
    if (platform.IS_MAC) {
      destination = `${platform.HOME_DIR}/lavapipe`
    }
  }
  destination = path.normalize(destination)

  core.debug(`lavapipe_destination: ${destination}`)

  return destination
}

/**
 * getInputVersionMesa validates the "mesa_version" argument.
 * If "mesa_version" was not set or is empty, assume "latest" version.
 *
 * @export
 * @param {string} requested_version
 * @return {*}  {Promise<string>}
 */
/*async function getIputLavapipeVersion(requested_version: string): Promise<string> {
  // assume "latest version", if "lavapipe_version" was not set or is empty
  if (requested_version === '') {
    requested_version = 'latest'
    return requested_version
  }

  // ensure requested_version is in a proper format
  if (!requested_version && !validateVersion(requested_version)) {
    const availableVersions = await version_getter.getVersionsLavapipe()
    const versions = JSON.stringify(availableVersions, null, 2)

    throw new Error(
      `Invalid format of "lavapipe_version: (${requested_version}").
       Please specify a version using the format 'major.minor.build.rev'.
       The following versions are available: ${versions}.`
    )
  }

  return requested_version
}*/
