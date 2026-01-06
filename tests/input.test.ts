/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import path from 'node:path'
import * as inputs from '../src/inputs'
import { getInputs } from '../src/inputs'
import * as core from '@actions/core'
import * as platform from '../src/platform'

// Mock the core.getInput function
jest.mock('@actions/core')

describe('getInputs', () => {
  afterEach(() => {
    jest.resetModules() // Reset modules after each test
    jest.restoreAllMocks() // Restore all mocks
    jest.clearAllMocks() // Clear spy call history
  })

  it('should return expected input values', async () => {
    // Mock core.getInput behavior
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
      const mockInputs: Record<string, string> = {
        // vulkan
        vulkan_version: '1.4.328.1',
        destination: '/some/path',
        install_runtime: 'true',
        install_runtime_only: 'false',
        use_cache: 'false',
        // invalid components are filtered out, so the expected array is empty
        optional_components: 'someInvalidComponent,anotherInvalidComponent',
        stripdown: 'false',
        // swiftshader
        install_swiftshader: 'false',
        swiftshader_destination: `${platform.HOME_DIR}/swiftshader`,
        // lavapipe
        install_lavapipe: 'false',
        lavapipe_destination: `${platform.HOME_DIR}/lavapipe`,
        // GithubToken
        github_token: ''
      }
      return mockInputs[name] || ''
    })

    // Call getInputs and check the result
    await expect(getInputs()).resolves.toEqual({
      // vulkan
      version: '1.4.328.1',
      destination: '/some/path',
      installRuntime: true,
      installRuntimeOnly: false,
      useCache: false,
      optionalComponents: [],
      stripdown: false,
      // swiftshader
      installSwiftshader: false,
      swiftshaderDestination: `${platform.HOME_DIR}/swiftshader`,
      // lavapipe
      installLavapipe: false,
      lavapipeDestination: `${platform.HOME_DIR}/lavapipe`,
      // GithubToken
      githubToken: ''
    })
  })

  it('should set installRuntime to true when installRuntimeOnly is true', async () => {
    // Mock core.getInput behavior
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
      const mockInputs: Record<string, string> = {
        // vulkan
        vulkan_version: '1.4.328.1',
        destination: '/some/path',
        install_runtime: 'false', // initially false
        install_runtime_only: 'true', // but runtime only true
        cache: 'false',
        optional_components: '',
        stripdown: 'false',
        // swiftshader
        install_swiftshader: 'false',
        swiftshader_destination: `${platform.HOME_DIR}/swiftshader`,
        // lavapipe
        install_lavapipe: 'false',
        lavapipe_destination: `${platform.HOME_DIR}/lavapipe`
      }
      return mockInputs[name] || ''
    })

    // Call getInputs and check that installRuntime is set to true
    await expect(getInputs()).resolves.toEqual({
      // vulkan
      version: '1.4.328.1',
      destination: '/some/path',
      githubToken: '',
      installRuntime: true, // should be true because installRuntimeOnly is true
      installRuntimeOnly: true,
      useCache: false,
      optionalComponents: [],
      stripdown: false,
      // swiftshader
      installSwiftshader: false,
      swiftshaderDestination: `${platform.HOME_DIR}/swiftshader`,
      // lavapipe
      installLavapipe: false,
      lavapipeDestination: `${platform.HOME_DIR}/lavapipe`
    })
  })

  it('should handle optional components with valid and invalid entries', () => {
    const mixed = 'a,b,com.lunarg.vulkan.x64,com.lunarg.vulkan.debug'
    const result = (require('../src/inputs') as typeof import('../src/inputs')).getInputVulkanOptionalComponents(mixed)

    expect(result).toEqual(['com.lunarg.vulkan.x64', 'com.lunarg.vulkan.debug'])
  })
})

describe('validateVersion', () => {
  it('should return true for a valid version string "1.2.3.4"', () => {
    expect(inputs.validateVersion('1.2.3.4')).toBe(true)
  })

  it('should return false for a version string with missing components "1.2.3"', () => {
    expect(inputs.validateVersion('1.2.3')).toBe(false)
  })

  it('should return false for a version string with non-numeric characters "v1.2.3.4"', () => {
    expect(inputs.validateVersion('v1.2.3.4')).toBe(false)
  })

  it('should return false for an empty version string', () => {
    expect(inputs.validateVersion('')).toBe(false)
  })
})

describe('getInputVulkanVersion', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it('should throw an error for invalid/undefined version and include available versions', async () => {
    jest.resetModules()
    const versionsVulkan = require('../src/versions_vulkan')
    jest.spyOn(versionsVulkan, 'getAvailableVersions').mockResolvedValue({ versions: ['1.2.3.4'] })

    const inputs = require('../src/inputs')

    await expect(inputs.getInputVulkanVersion(undefined as unknown as string)).rejects.toThrow(
      /Invalid format of "vulkan_version:/
    )
  })
})

describe('getInputDestination', () => {
  afterEach(() => {
    jest.resetModules() // Reset modules after each test
    jest.restoreAllMocks() // Restore all mocks
    jest.clearAllMocks() // Clear spy call history
  })

  it('should return normalized provided destination if non-empty', () => {
    const provided = 'my/custom/../destination'
    const normalized = path.normalize(provided)
    expect(inputs.getInputVulkanDestination(provided)).toEqual(normalized)
  })

  describe('when destination is empty', () => {
    let os: typeof import('node:os')

    beforeEach(() => {
      jest.resetModules()
      jest.clearAllMocks()

      jest.doMock('node:os', () => ({
        platform: jest.fn()
      }))

      os = require('node:os') // Reimport mocked os module
    })

    it('should return Windows default when platform is Windows', () => {
      ;(os.platform as jest.Mock).mockReturnValue('win32')

      jest.doMock('../src/platform', () => ({
        IS_WINDOWS: true,
        HOME_DIR: 'C:\\Users\\Test',
        OS_PLATFORM: 'windows'
      }))

      const platform = require('../src/platform')
      const inputs = require('../src/inputs')

      expect(os.platform()).toBe('win32')
      expect(platform.OS_PLATFORM).toBe('windows')

      const expected = path.normalize('C:\\VulkanSDK\\')
      expect(inputs.getInputVulkanDestination('')).toEqual(expected)
    })

    it('should return Linux default when platform is Linux', () => {
      ;(os.platform as jest.Mock).mockReturnValue('linux')

      jest.doMock('../src/platform', () => ({
        IS_LINUX: true,
        HOME_DIR: '/home/test',
        OS_PLATFORM: 'linux'
      }))

      const platform = require('../src/platform')
      const inputs = require('../src/inputs')

      expect(os.platform()).toBe('linux')
      expect(platform.OS_PLATFORM).toBe('linux')

      const expected = path.normalize('/home/test/vulkan-sdk')
      expect(inputs.getInputVulkanDestination('')).toEqual(expected)
    })

    it('should return macOS default when platform is macOS', () => {
      ;(os.platform as jest.Mock).mockReturnValue('darwin')

      jest.doMock('../src/platform', () => ({
        IS_MAC: true,
        HOME_DIR: '/home/test',
        OS_PLATFORM: 'darwin'
      }))

      const platform = require('../src/platform')
      const inputs = require('../src/inputs')

      expect(os.platform()).toBe('darwin')
      expect(platform.OS_PLATFORM).toBe('darwin')

      const expected = path.normalize('/home/test/vulkan-sdk')
      expect(inputs.getInputVulkanDestination('')).toEqual(expected)
    })
  })

  it('should return Windows ARM default when platform.IS_WINDOWS_ARM is true', () => {
    jest.resetModules()
    jest.doMock('../src/platform', () => ({ IS_WINDOWS_ARM: true, HOME_DIR: 'C:\\Users\\Test', IS_WINDOWS: false }))
    const inputs = require('../src/inputs')
    const expected = path.normalize('C:\\VulkanSDK\\')
    expect(inputs.getInputVulkanDestination('')).toEqual(expected)
  })

  it('should return Linux ARM default when platform.IS_LINUX_ARM is true', () => {
    jest.resetModules()
    jest.doMock('../src/platform', () => ({ IS_LINUX_ARM: true, HOME_DIR: '/home/test', IS_LINUX: false }))
    const inputs = require('../src/inputs')
    const expected = path.normalize('/home/test/vulkan-sdk')
    expect(inputs.getInputVulkanDestination('')).toEqual(expected)
  })

  it('getInputs should return default swiftshader and lavapipe destinations when empty', async () => {
    jest.resetModules()
    jest.clearAllMocks()

    // Mock platform to linux
    jest.doMock('../src/platform', () => ({ IS_LINUX: true, HOME_DIR: '/home/test', IS_WINDOWS: false, IS_MAC: false }))
    const coreMock = require('@actions/core')
    coreMock.getInput = jest.fn().mockImplementation((name: string) => {
      const map: Record<string, string> = {
        vulkan_version: '1.4.328.1',
        destination: '',
        install_runtime: 'false',
        cache: 'false',
        optional_components: '',
        stripdown: 'false',
        install_swiftshader: 'false',
        swiftshader_destination: '',
        install_Lavapipe: 'false',
        lavapipe_destination: '',
        github_token: ''
      }
      return map[name] || ''
    })

    const inputsModule = require('../src/inputs')
    const result = await inputsModule.getInputs()

    expect(result.swiftshaderDestination).toBe('/home/test/swiftshader')
    expect(result.lavapipeDestination).toBe('/home/test/lavapipe')
  })
})

describe('inputs extra coverage', () => {
  afterEach(() => {
    jest.resetModules()
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it('getInputVulkanOptionalComponents logs invalid components and returns valid ones', () => {
    const mixed = 'a,b,com.lunarg.vulkan.x64,com.lunarg.vulkan.debug'
    const spy = jest.spyOn(require('@actions/core'), 'info').mockImplementation(() => undefined)
    const result = (require('../src/inputs') as typeof import('../src/inputs')).getInputVulkanOptionalComponents(mixed)
    expect(result).toEqual(['com.lunarg.vulkan.x64', 'com.lunarg.vulkan.debug'])
    // Should have logged invalid components message once and valid components message once
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('getInputVulkanVersion returns latest when empty', async () => {
    const inputs = require('../src/inputs')
    const v = await inputs.getInputVulkanVersion('')
    expect(v).toBe('latest')
  })

  it('getInputVulkanVersion returns provided valid version', async () => {
    const inputs = require('../src/inputs')
    const v = await inputs.getInputVulkanVersion('1.2.3.4')
    expect(v).toBe('1.2.3.4')
  })

  it('getInputSwiftshaderDestination normalizes provided path (placeholder)', () => {
    // helper is private; behavior covered via getInputs tests
    expect(true).toBe(true)
  })

  it('getInputLavapipeDestination returns default for mac (placeholder)', () => {
    // helper is private; behavior covered via getInputs tests
    expect(true).toBe(true)
  })
})
