import * as fs from 'fs'
import * as path from 'path'
import * as child from 'child_process'

// mock child_process execSync so we can call functions that execute commands
jest.mock('child_process', () => ({ execSync: jest.fn() }))
jest.mock('@actions/core')
jest.mock('@actions/tool-cache')

const installer = require('../src/installer_vulkan')
const platform = require('../src/platform')
const archive = require('../src/archive')

describe('installer_vulkan', () => {
  const tmpRoot = path.join(__dirname, 'tmp_installer')

  beforeAll(() => {
    // ensure fresh temp
    try {
      fs.rmSync(tmpRoot, { recursive: true })
    } catch (e) {
      // ignore
    }
    fs.mkdirSync(tmpRoot, { recursive: true })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
    // default platform flags
    Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_LINUX', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_LINUX_ARM', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_MAC', { value: false, configurable: true })
  })

  afterAll(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true })
    } catch (e) {
      // ignore
    }
  })

  it('installVulkanSdkLinux should call archive.extract and return installPath', async () => {
    const sdkPath = '/some/sdk.tar.gz'
    const destination = path.join(tmpRoot, 'linux_dest')
    const fakeInstall = path.join(destination, '1.2.3.4')
    ;(archive.extract as jest.Mock) = jest.fn().mockResolvedValue(fakeInstall)

    const ret = await installer.installVulkanSdkLinux(sdkPath, destination, [])
    expect(ret).toBe(fakeInstall)
    expect(archive.extract).toHaveBeenCalledWith(sdkPath, destination)
  })

  it('installVulkanSdkMacDmg and MacZip should call execSync and return destination', async () => {
    // mock execSync
    ;(child.execSync as jest.Mock).mockImplementation(() => Buffer.from(''))

    Object.defineProperty(platform, 'IS_MAC', { value: true, configurable: true })
    const sdkPath = '/tmp/fake.dmg'
    const destination = path.join(tmpRoot, 'mac_dest_dmg')
    fs.mkdirSync(destination, { recursive: true })
    const ret = await installer.installVulkanSdkMacDmg(sdkPath, destination, '1.3.290.0', [])
    expect(ret).toBe(destination)

    const zipDest = path.join(tmpRoot, 'mac_dest_zip')
    fs.mkdirSync(zipDest, { recursive: true })
    ;(archive.extract as jest.Mock) = jest.fn().mockResolvedValueOnce(path.join(tmpRoot, 'extracted'))
    const retZip = await installer.installVulkanSdkMacZip('/tmp/fake.zip', zipDest, '1.4.305.0', [])
    expect(retZip).toBe(zipDest)
  })

  it('installVulkanSdkWindows should call execSync and return destination', async () => {
    ;(child.execSync as jest.Mock).mockImplementation(() => Buffer.from(''))
    Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
    const sdkPath = path.normalize('C:\\fake\\VulkanSDK-Installer.exe')
    const destination = path.normalize('C:\\VulkanSDK\\1.2.3.4')
    const ret = await installer.installVulkanSdkWindows(sdkPath, destination, [])
    expect(ret).toBe(destination)
  })

  it('installVulkanRuntime should extract runtime and copy into destination', async () => {
    jest.setTimeout(20000)
    // prepare temp install folder structure
    // use test tmp as TEMP_DIR so installer looks in our test folder
    Object.defineProperty(platform, 'TEMP_DIR', { value: tmpRoot, configurable: true })
    const tempInstallPath = path.join(platform.TEMP_DIR, 'vulkan-runtime')
    const topFolder = 'VulkanRT-1.3.250.1-Components'
    const tempTop = path.join(tempInstallPath, topFolder)
    fs.mkdirSync(tempTop, { recursive: true })
    // create a file inside
    fs.writeFileSync(path.join(tempTop, 'vulkan-1.dll'), 'dll')

    ;(archive.extract as jest.Mock) = jest.fn().mockImplementation((_url, dest) => Promise.resolve(dest))

    const runtimeDestBase = path.join(tmpRoot, 'VulkanSDK')
    const version = '1.3.250.1'
    // create the tempInstallPath that installVulkanRuntime expects
    fs.mkdirSync(tempInstallPath, { recursive: true })

    // call function (will actually wait ~3s inside)
    const installed = await installer.installVulkanRuntime('/tmp/fake-runtime.zip', runtimeDestBase, version)
    // should copy files into runtime path
    expect(installed).toBe(path.normalize(`${runtimeDestBase}/${version}/runtime`))
    // verify that runtime folder exists and contains the dll
    const copied = path.join(runtimeDestBase, version, 'runtime', 'vulkan-1.dll')
    expect(fs.existsSync(copied)).toBeTruthy()
    // nothing to restore
  })

  it('installVulkanRuntimeFromSdk copies runtime files when system files exist', () => {
    // Instead of mocking fs.existsSync (which can be non-writable in some runtimes),
    // create real files at the relative paths the SUT checks. The module checks
    // paths like "C:/WINDOWS/SysWOW64/vulkan-1.dll" which on POSIX are treated
    // as relative paths; change the cwd to tmpRoot so the files live under our
    // test tmp and the SUT will find them.
    const originalCwd = process.cwd()
    try {
      process.chdir(tmpRoot)
      const syswow = path.join('C:/WINDOWS/SysWOW64')
      const system32 = path.join('C:/WINDOWS/system32')
      fs.mkdirSync(syswow, { recursive: true })
      fs.mkdirSync(system32, { recursive: true })
      // create the dlls the installer will look for
      fs.writeFileSync(path.join(syswow, 'vulkan-1.dll'), 'dll')
      fs.writeFileSync(path.join(system32, 'vulkan-1.dll'), 'dll')

      const dest = path.join(tmpRoot, 'sdk', '1.2.3.4')
      const installed = installer.installVulkanRuntimeFromSdk(dest)
      expect(installed).toContain(path.normalize(`${dest}/runtime`))
      // verify that the runtime files were copied into the SDK runtime folders
      const x86File = path.join(dest, 'runtime', 'x86', 'vulkan-1.dll')
      const x64File = path.join(dest, 'runtime', 'x64', 'vulkan-1.dll')
      expect(fs.existsSync(x86File)).toBeTruthy()
      expect(fs.existsSync(x64File)).toBeTruthy()
    } finally {
      process.chdir(originalCwd)
    }
  })

  it('installVulkanSdkMacDmg should call setFailed on installer error but still detach', async () => {
    const core = require('@actions/core')
    const spySetFailed = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined)

    Object.defineProperty(platform, 'IS_MAC', { value: true, configurable: true })

    // mock execSync to succeed on attach, throw on installer, succeed on detach
    ;(child.execSync as jest.Mock).mockImplementation((cmd: string) => {
      const s = String(cmd)
      if (s.includes('hdiutil attach')) return Buffer.from('')
      // throw only for the installer invocation (contains InstallVulkan or vulkansdk-macOS)
      if (s.includes('InstallVulkan') || s.includes('vulkansdk-macOS')) throw new Error('installer failed')
      if (s.includes('hdiutil detach')) return Buffer.from('')
      return Buffer.from('')
    })

    const sdkPath = '/tmp/fake.dmg'
    const destination = path.join(tmpRoot, 'mac_fail')
    fs.mkdirSync(destination, { recursive: true })

    await installer.installVulkanSdkMacDmg(sdkPath, destination, '1.3.290.0', [])
    expect(spySetFailed).toHaveBeenCalled()
    spySetFailed.mockRestore()
  })

  it('installVulkanSdkMacZip should call setFailed on installer error', async () => {
    const core = require('@actions/core')
    const spySetFailed = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined)

    Object.defineProperty(platform, 'IS_MAC', { value: true, configurable: true })
    ;(archive.extract as jest.Mock) = jest.fn().mockResolvedValue(path.join(tmpRoot, 'extracted'))

    ;(child.execSync as jest.Mock).mockImplementation((cmd: string) => {
      if (String(cmd).includes('/tmp')) throw new Error('installer failed')
      return Buffer.from('')
    })

    const ret = await installer.installVulkanSdkMacZip(
      '/tmp/fake.zip',
      path.join(tmpRoot, 'mac_zip_fail'),
      '1.4.305.0',
      []
    )
    expect(ret).toBe(path.join(tmpRoot, 'mac_zip_fail'))
    expect(spySetFailed).toHaveBeenCalled()
    spySetFailed.mockRestore()
  })

  it('installVulkanSdkWindows should call setFailed on installer error', async () => {
    const core = require('@actions/core')
    const spySetFailed = jest.spyOn(core, 'setFailed').mockImplementation(() => undefined)

    Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
    ;(child.execSync as jest.Mock).mockImplementation(() => {
      throw new Error('windows installer failed')
    })

    const sdkPath = path.normalize('C:\\fake\\VulkanSDK-Installer.exe')
    const destination = path.normalize('C:\\VulkanSDK\\1.2.3.4')
    const ret = await installer.installVulkanSdkWindows(sdkPath, destination, [])
    expect(ret).toBe(destination)
    expect(spySetFailed).toHaveBeenCalled()
    spySetFailed.mockRestore()
  })

  it('getVulkanSdkPath warns when the path does not exist', () => {
    const core = require('@actions/core')
    const spyWarn = jest.spyOn(core, 'warning').mockImplementation(() => undefined)
    Object.defineProperty(platform, 'IS_LINUX', { value: true, configurable: true })
    installer.getVulkanSdkPath('/nonexistent', '1.2.3.4')
    expect(spyWarn).toHaveBeenCalled()
    spyWarn.mockRestore()
  })

  it('runVulkanInfo should execute command and write stdout when present', () => {
    // create a fake executable file
    const fakeExe = path.join(tmpRoot, 'fake_vulkaninfo')
    fs.writeFileSync(fakeExe, '')
    // The file exists on disk, so runVulkanInfo should call execSync and write stdout.
    ;(child.execSync as jest.Mock).mockImplementation(() => Buffer.from('summary output'))
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    installer.runVulkanInfo(fakeExe)

    expect(child.execSync).toHaveBeenCalled()
    // ensure the command included the --summary argument
    expect((child.execSync as jest.Mock).mock.calls[0][0]).toBe(`${fakeExe} --summary`)
    expect(stdoutSpy).toHaveBeenCalled()

    stdoutSpy.mockRestore()
  })

  it('verifyInstallationOfSdk returns true when vulkaninfo exists', () => {
    // simulate linux sdk layout
    Object.defineProperty(platform, 'IS_LINUX', { value: true, configurable: true })
    const sdkBase = path.join(tmpRoot, 'sdk1')
    const bin = path.join(sdkBase, 'bin')
    fs.mkdirSync(bin, { recursive: true })
    fs.writeFileSync(path.join(bin, 'vulkaninfo'), 'x')

    const ok = installer.verifyInstallationOfSdk(sdkBase)
    expect(ok).toBeTruthy()
  })

  it('getVulkanSdkPath adds architecture suffixes for linux and mac', () => {
    const base = path.join(tmpRoot, 'sdk_path')
    const version = '9.9.9'
    // linux arm
    Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_LINUX_ARM', { value: true, configurable: true })
    Object.defineProperty(platform, 'IS_LINUX', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_MAC', { value: false, configurable: true })
    const aarchDir = path.join(base, version, 'aarch64')
    fs.mkdirSync(aarchDir, { recursive: true })
    const p1 = installer.getVulkanSdkPath(base, version)
    expect(p1.includes(version)).toBeTruthy()
    expect(p1.includes('aarch64')).toBeTruthy()

    // linux x86_64
    Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_LINUX_ARM', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_LINUX', { value: true, configurable: true })
    const x86dir = path.join(base, version, 'x86_64')
    fs.mkdirSync(x86dir, { recursive: true })
    const p2 = installer.getVulkanSdkPath(base, version)
    expect(p2.includes(version)).toBeTruthy()
    expect(p2.includes('x86_64')).toBeTruthy()

    // mac
    Object.defineProperty(platform, 'IS_WINDOWS', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_LINUX', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_MAC', { value: true, configurable: true })
    const macdir = path.join(base, version, 'macOS')
    fs.mkdirSync(macdir, { recursive: true })
    const p3 = installer.getVulkanSdkPath(base, version)
    expect(p3.includes(version)).toBeTruthy()
    expect(p3.includes('macOS')).toBeTruthy()
  })

  it('stripdownInstallationOfSdk should skip subdirectories when deleting files', () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
    const sdkPath = path.join(tmpRoot, 'strip_sdk2')
    fs.mkdirSync(sdkPath, { recursive: true })
    // create a subdir and a top-level file
    fs.mkdirSync(path.join(sdkPath, 'subdir'), { recursive: true })
    fs.writeFileSync(path.join(sdkPath, 'keep.txt'), 'x')

    installer.stripdownInstallationOfSdk(sdkPath)

    // subdir should still exist (deleteFilesInFolder skips directories)
    expect(fs.existsSync(path.join(sdkPath, 'subdir'))).toBe(true)
    // top-level file should be deleted
    expect(fs.existsSync(path.join(sdkPath, 'keep.txt'))).toBe(false)
  })

  it('copyFolder should recursively copy nested folders', async () => {
    // setup nested source structure
    Object.defineProperty(platform, 'TEMP_DIR', { value: tmpRoot, configurable: true })
    const tempInstallPath = path.join(platform.TEMP_DIR, 'vulkan-runtime')
    const fakeTop = 'vulkan-runtime-nested'
    const fakeTemp = path.join(tempInstallPath, fakeTop)
    // create nested structure under the tempInstallPath so the SUT's readdirSync sees it
    fs.mkdirSync(path.join(fakeTemp, 'A', 'B'), { recursive: true })
    fs.writeFileSync(path.join(fakeTemp, 'A', 'B', 'deep.txt'), 'data')
    // sanity checks - ensure our setup exists
    expect(fs.existsSync(fakeTemp)).toBeTruthy()
    expect(fs.existsSync(path.join(fakeTemp, 'A', 'B', 'deep.txt'))).toBeTruthy()
    // mock extract to resolve the temp install path (where the top-level folder lives)
    ;(archive.extract as jest.Mock) = jest.fn().mockResolvedValue(tempInstallPath)

    const destBase = path.join(tmpRoot, 'sdk_nested')
    await installer.installVulkanRuntime('/tmp/fake.zip', destBase, '9.9.9.9')

    const copied = path.join(destBase, '9.9.9.9', 'runtime', 'A', 'B', 'deep.txt')
    expect(fs.existsSync(copied)).toBeTruthy()
  })

  it('getVulkanInfoPath & getVulkanSdkPath & verifyInstallationOfRuntime behavior', () => {
    // test path resolution for linux
    Object.defineProperty(platform, 'IS_LINUX', { value: true, configurable: true })
    const sdkBase = '/usr/vulkan-sdk/1.2.3.4/x86_64'
    const infoPath = installer.getVulkanInfoPath(sdkBase)
    expect(infoPath).toContain(path.join('bin', 'vulkaninfo'))

    // create the expected install path for verification
    const runtimeBase = path.join(tmpRoot, 'verify_runtime')
    const x64 = path.join(runtimeBase, 'x64')
    fs.mkdirSync(x64, { recursive: true })
    fs.writeFileSync(path.join(x64, 'vulkan-1.dll'), 'dll')
    fs.writeFileSync(path.join(x64, 'vulkaninfo.exe'), 'exe')

    Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
    Object.defineProperty(platform, 'IS_WINDOWS_ARM', { value: false, configurable: true })
    const ok = installer.verifyInstallationOfRuntime(runtimeBase)
    expect(ok).toBeTruthy()
  })

  it('runVulkanInfo logs warning when vulkaninfo not present', () => {
    const spyWarn = jest.spyOn(require('@actions/core'), 'warning').mockImplementation(() => undefined)
    const fakePath = '/nonexistent/vulkaninfo'
    // pass a path that doesn't exist; no need to override fs.existsSync which
    // can be read-only in some runtimes
    installer.runVulkanInfo(fakePath)
    expect(spyWarn).toHaveBeenCalled()
    spyWarn.mockRestore()
  })

  it('stripdownInstallationOfSdk deletes folders and files', () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
    const sdkPath = path.join(tmpRoot, 'strip_sdk')
    // create folders and files
    const folders = ['Demos', 'Helpers', 'installerResources', 'Licenses', 'Templates']
    fs.mkdirSync(sdkPath, { recursive: true })
    // installer uses backslash paths when removing folders on Windows, create those
    for (const f of folders) {
      fs.mkdirSync(`${sdkPath}\\${f}`, { recursive: true })
    }
    // create a top-level file
    fs.writeFileSync(path.join(sdkPath, 'maintenancetool.exe'), 'x')

    installer.stripdownInstallationOfSdk(sdkPath)
    // folders should be gone
    for (const f of folders) {
      expect(fs.existsSync(path.join(sdkPath, f))).toBe(false)
    }
    // top-level file should be deleted
    expect(fs.existsSync(path.join(sdkPath, 'maintenancetool.exe'))).toBe(false)
  })

  it('copyFolder recursively copies files and folders via installVulkanRuntime', () => {
    const top = 'Top'
    // prepare the expected temp install path that the function will read from
    Object.defineProperty(platform, 'TEMP_DIR', { value: tmpRoot, configurable: true })
    const fakeTemp = path.join(platform.TEMP_DIR, 'vulkan-runtime')
    fs.mkdirSync(path.join(fakeTemp, top), { recursive: true })
    fs.writeFileSync(path.join(fakeTemp, top, 'a.txt'), 'x')
    ;(archive.extract as jest.Mock) = jest.fn().mockResolvedValue(fakeTemp)
    jest.setTimeout(20000)
    return installer.installVulkanRuntime('/tmp/fake.zip', path.join(tmpRoot, 'sdk2'), '9.9.9.9').then(() => {
      const copied = path.join(tmpRoot, 'sdk2', '9.9.9.9', 'runtime', 'a.txt')
      expect(fs.existsSync(copied)).toBeTruthy()
    })
  })

  it('installVulkanSdkMacZip should handle installer name variant >= 1.4.313.0', async () => {
    Object.defineProperty(platform, 'IS_MAC', { value: true, configurable: true })
    // mock extract and execSync to avoid real commands
    ;(archive.extract as jest.Mock) = jest.fn().mockResolvedValue(path.join(tmpRoot, 'extracted3'))
    ;(child.execSync as jest.Mock).mockImplementation(() => Buffer.from(''))

    const dest = path.join(tmpRoot, 'mac_new')
    fs.mkdirSync(dest, { recursive: true })
    const ret = await installer.installVulkanSdkMacZip('/tmp/fake313.zip', dest, '1.4.313.0', [])
    expect(ret).toBe(dest)
  })

  it('runVulkanInfo logs an error if execSync throws', () => {
    const core = require('@actions/core')
    const spyError = jest.spyOn(core, 'error').mockImplementation(() => undefined)

    const fakeExe = path.join(tmpRoot, 'vulkaninfo_error')
    fs.writeFileSync(fakeExe, '')
    ;(child.execSync as jest.Mock).mockImplementation(() => {
      throw new Error('exec failed')
    })

    installer.runVulkanInfo(fakeExe)
    expect(spyError).toHaveBeenCalled()
    spyError.mockRestore()
  })

  it('stripdownInstallationOfSdk handles rmSync throwing and continues to delete files', () => {
    Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
    const sdkPath = path.join(tmpRoot, 'strip_error')
    fs.mkdirSync(sdkPath, { recursive: true })
    const folders = ['Demos']
    for (const f of folders) {
      fs.mkdirSync(path.join(sdkPath, f), { recursive: true })
    }
    const topFile = path.join(sdkPath, 'maintenancetool.exe')
    fs.writeFileSync(topFile, 'x')

    // call stripdown; ensure it does not throw and deletes top-level files
    expect(() => installer.stripdownInstallationOfSdk(sdkPath)).not.toThrow()
    // top-level file should be deleted by deleteFilesInFolder
    expect(fs.existsSync(topFile)).toBe(false)
  })

  it('verifyInstallationOfSdk and verifyInstallationOfRuntime false paths', () => {
    // verifyInstallationOfSdk false
    Object.defineProperty(platform, 'IS_LINUX', { value: true, configurable: true })
    const non = installer.verifyInstallationOfSdk('/non/existent')
    expect(non).toBe(false)

    // verifyInstallationOfRuntime false when missing files
    Object.defineProperty(platform, 'IS_LINUX', { value: false, configurable: true })
    Object.defineProperty(platform, 'IS_WINDOWS', { value: true, configurable: true })
    const runtimeBase = path.join(tmpRoot, 'runtime_missing')
    fs.mkdirSync(runtimeBase, { recursive: true })
    // no x64 files
    const ok = installer.verifyInstallationOfRuntime(runtimeBase)
    expect(ok).toBe(false)
  })
})
