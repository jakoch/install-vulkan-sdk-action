import * as io from '@actions/io'
import {HttpClient} from '@actions/http-client'
import {getPlatform} from '../src/platform'
import * as downloader from '../src/downloader'
import * as installer from '../src/installer'
import * as inputs from '../src/inputs'
import * as version_getter from '../src/versiongetter'
import * as path from 'path'
import {expect, test} from '@jest/globals'
import {env} from 'process'

env.RUNNER_TOOL_CACHE = path.join(__dirname, '../tmp/runner_tools')
env.RUNNER_TEMP = path.join(__dirname, '../tmp/runner_tmpdir')

jest.setTimeout(60000) // 60 second timeout

describe('inputs', () => {
  /*test('GetInputs', async () => {
    const i = await inputs.getInputs()
    expect(i.version).toBeDefined()
    expect(i.destination).toBeDefined()
    expect(i.install_runtime).toBeDefined()
    expect(i.use_cache).toBeDefined()
  })*/
  /*test('validateVersion', async () => {
    expect(inputs.validateVersion("1.2.3.4")).toBeTruthy()
    expect(inputs.validateVersion("1.2-rc")).toBeFalsy()
  })
  test('getInputVersion: invalid version, throws error"', async () => {
    expect(inputs.getInputVersion("a.b.c")).toThrowError()
  })
  test('getInputVersion: empty version, returns "latest"', async () => {
    expect(inputs.getInputVersion("")).toStrictEqual("latest")
  })*/
  //test('getInputDestination', async () => { })

  test('When optional_components list contains invalid values, it results in an empty components list', async () => {
    const optional_components = 'a, b, c'
    const out = inputs.getInputOptionalComponents(optional_components)
    expect((await out).length).toBe(0)
  })
  test('The optional_components list is filtered for valid values', async () => {
    const optional_components = 'a, b, com.lunarg.vulkan.32bit'
    const out = inputs.getInputOptionalComponents(optional_components)
    const expected_optional_components = 'com.lunarg.vulkan.32bit'
    const first_element_of_out_array = (await out).find(Boolean)
    expect(first_element_of_out_array).toEqual(expected_optional_components)
  })
})

describe('platform', () => {
  test('getPlatform', async () => {
    const platform = getPlatform()
    let plat: string = process.platform
    if (plat === 'win32') {
      plat = 'windows'
    }
    expect(platform).toStrictEqual(plat)
  })
})

describe('version', () => {
  beforeAll(() => {
    jest.mock('@actions/http-client')
  })
  afterEach(() => jest.resetAllMocks())

  it('Fetches the list of latest versions.', async () => {
    const latestVersionResponseData = {linux: '1.3.216.0', mac: '1.3.216.0', windows: '1.3.216.0'}
    HttpClient.prototype.getJson = jest.fn().mockResolvedValue({statusCode: 200, result: {latestVersionResponseData}})

    const latestVersions = await version_getter.getLatestVersions()

    expect(HttpClient.prototype.getJson).toHaveBeenCalledWith('https://vulkan.lunarg.com/sdk/latest.json')
    expect(latestVersions).not.toBeNull
    //expect(latestVersions?.windows).not.toEqual('')
  })
})

/*describe('download', () => {
  // remove the cache and temp
  beforeAll(async () => {
    await io.rmRF(<string>env.RUNNER_TOOL_CACHE)
    await io.rmRF(<string>env.RUNNER_TEMP)
  })

  it('Gets the download URL of the latest version.', async () => {
    const input_version = 'latest'
    const version = await version_getter.resolve_version(input_version)
    const latestVersion = await downloader.get_url_vulkan_sdk(version)
    expect(latestVersion).not.toBeNull
  })

  it('Gives an error, when trying to install an invalid version number.', () => {
    expect.assertions(1)
    return downloader.download_vulkan_sdk('0.0.0').catch(e => {
      expect(<Error>e.message).toContain('version not found')
    })
  })

  it('Downloads to default path, when using a valid version number.', () => {
    return downloader.download_vulkan_sdk('1.2.189.0').then(data => {
      expect(data).not.toEqual('')
    })
  })
})*/

describe('installer', () => {
  /*it('Installs SDK into "../third-party/vulkan-sdk" folder, when using a valid version number.', async () => {
    const version = '1.2.189.0'
    const sdk_download_path = await downloader.download_vulkan_sdk(version)

    // one level up from __test__
    const installation_folder = '/../third-party/vulkan-sdk'
    const sdk_install_path = path.join(__dirname, installation_folder)

    return installer.install_vulkan_sdk(sdk_download_path, sdk_install_path, version).then(data => {
      expect(data).not.toEqual('')
    })
  })*/

  it('Allows to install optional components', async () => {
    const input_optional_components = 'com.lunarg.vulkan.32bit, com.lunarg.vulkan.debug32'
  })
})
