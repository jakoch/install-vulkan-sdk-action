/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import { execSync } from 'node:child_process'
import * as core from '@actions/core'

/**
 * Registers a single ICD JSON in the Windows registry.
 *
 * @param {string} icdPath - The normalized path to the ICD JSON file.
 */
export function registerDriverInWindowsRegistry(icdPath: string) {
  try {
    core.info(`🔧 Registering installable client driver (ICD) in Windows registry: ${icdPath}`)
    // Add key, if not existing
    execSync(`reg add "HKLM\\SOFTWARE\\Khronos\\Vulkan\\Drivers" /f`, { stdio: 'inherit' })
    // Add ICD JSON as a REG_DWORD (0 = enabled)
    execSync(`reg add "HKLM\\SOFTWARE\\Khronos\\Vulkan\\Drivers" /v "${icdPath}" /t REG_DWORD /d 0 /f`, {
      stdio: 'inherit'
    })
    core.info(`✔️ Successfully registered ICD.`)

    // Provide unregister command as user guidance
    core.info(`   You can unregister this ICD using the command:`)
    core.info(`   reg delete "HKLM\\SOFTWARE\\Khronos\\Vulkan\\Drivers" /v "${icdPath}" /f`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    core.warning(`⚠️ Failed to register ICD: ${errorMessage}`)
  }
}
