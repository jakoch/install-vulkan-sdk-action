[![GitHub Releases](https://img.shields.io/github/release/jakoch/install-vulkan-sdk-action.svg?style=flat-square)](https://github.com/jakoch/install-vulkan-sdk-action/releases/latest)
[![GitHub Workflow Status](https://github.com/jakoch/install-vulkan-sdk-action/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/jakoch/install-vulkan-sdk-action/actions/workflows/build.yml)
[![codecov](https://codecov.io/gh/jakoch/install-vulkan-sdk-action/graph/badge.svg?token=DSXXNBEGWK)](https://codecov.io/gh/jakoch/install-vulkan-sdk-action)

# Github Action: Install Vulkan SDK <!-- omit in toc -->

A Github Action to install the Vulkan SDK and runtime library.

It also supports installing SwiftShader and Lavapipe software rasterizers.

## Contents <!-- omit in toc -->

- [Features](#features)
- [Usage](#usage)
- [Action Reference](#action-reference)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
  - [Environment Variables](#environment-variables)
- [About Vulkan and the Vulkan SDK](#about-vulkan-and-the-vulkan-sdk)
  - [What is Vulkan?](#what-is-vulkan)
  - [What is the Vulkan SDK?](#what-is-the-vulkan-sdk)
  - [What is the Vulkan SDK for ARM?](#what-is-the-vulkan-sdk-for-arm)
  - [What is the Vulkan Runtime?](#what-is-the-vulkan-runtime)
  - [What are Installable Client Drivers (ICDs)?](#what-are-installable-client-drivers-icds)
  - [Where to find Vulkan Documentation](#where-to-find-vulkan-documentation)
- [Software Rasterizers](#software-rasterisers)
  - [SwiftShader](#about-swiftshader)
    - [What is SwiftShader?](#what-is-swiftshader)
    - [Installing SwiftShader](#installing-swiftshader)
    - [Registering SwiftShader as Vulkan Driver](#registering-swiftshader-as-vulkan-driver)
  - [LLVMPipe and Lavapipe](#llvmpipe-and-lavapipe)
    - [What is LLVMPipe? What is Lavapipe?](#what-is-llvmpipe-what-is-lavapipe)
    - [Installing Lavapipe](#installing-lavapipe)
    - [Registering Lavapipe as Vulkan Driver](#registering-lavapipe-as-vulkan-driver)
  - [Troubleshooting Loader Issues](#troubleshooting-loader-issues)
- [License](#license)
- [Development Reminder](#development-reminder)

## Features

This action has the following features:

- This action can be used to install the Vulkan SDK in your Github Action workflows.
  - The action automatically retrieves the latest Vulkan SDK version if no specific version is provided.
- The installation of optional SDK components is supported.
- The action can be used to install the Vulkan Runtime (Windows only) using download retries and automatic version lowering.
- This action allows you to install just the Vulkan Runtime, without the full Vulkan SDK (Windows only).
- The action supports Github Actions cache (for the Vulkan SDK and runtime).
  - The size of the installed SDK is reduced to achieve a smaller cache package size (Windows only).
- The installer supports runners for Windows, Linux, macOS, Windows-ARM, and Linux-ARM.
  - The repository [https://github.com/jakoch/vulkan-sdk-arm](https://github.com/jakoch/vulkan-sdk-arm) is used to build and package the Vulkan SDK for ARM64 runners.
- The action can be used to install the software rasterizers: Google SwiftShader and Mesa Lavapipe.
  - The repository [https://github.com/jakoch/rasterizers](https://github.com/jakoch/rasterizers) is used to build and package both rasterizers.

## Usage

```yaml
jobs:
  build:
    runs-on: ${{ matrix.config.os }}
    strategy:
      matrix:
        config:
          - { name: "Windows",       os: windows-latest }
          - { name: "Ubuntu",        os: ubuntu-latest }
          - { name: "MacOS",         os: macos-latest }
          - { name: "Ubuntu 22 Arm", os: ubuntu-22.04-arm }
          - { name: "Ubuntu 24 Arm", os: ubuntu-24.04-arm }
          - { name: "Windows Arm",   os: windows-11-arm }

    steps:
      - name: Install Vulkan SDK
        uses: jakoch/install-vulkan-sdk-action@v1
        with:
          # You can set the Vulkan SDK version to download.
          # Defaults to latest version, if version not set.
          vulkan_version: 1.3.231.1
          optional_components: com.lunarg.vulkan.vma
          install_runtime: true
          cache: true
          stripdown: true

          # You can install a software rasterizer.
          install_swiftshader: true
          install_lavapipe: true
```

## Action Reference

You can find all Inputs and Outputs and their default settings in the [action.yml](https://github.com/jakoch/install-vulkan-sdk-action/blob/main/action.yml) file.

### Inputs

The following inputs can be used as `steps.with` keys:

| Name                     | Type    | Description                             | Default                 | Required |
|--------------------------|---------|-----------------------------------------|-------------------------|----------|
| `vulkan_version`         | String  | A Vulkan SDK version (eg. `1.3.231.1`). | If `vulkan_version` is not set, the latest version is used. | false |
| `destination`            | String  | The Vulkan SDK installation folder.     | Windows: `C:\VulkanSDK`. Linux/MacOS: `%HOME/vulkan-sdk` | false |
| `optional_components`    | String  | Comma-separated list of components to install. | Default: no optional components. | false |
| `install_runtime`        | bool    | Windows only. Installs the vulkan runtime ('vulkan-1.dll') into a `runtime` folder inside `destination`, if true. Windows: `C:\VulkanSDK\{vulkan_version}\runtime\{x86,x64}`. | true | false |
| `install_runtime_only`   | bool    | Windows only. Installs just the Vulkan Runtime components and disables the installation of the Vulkan SDK. Implicitly sets `install_runtime` to true. | false | false |
| `cache`                  | bool    | Cache the Vulkan installation folder.   | true | false |
| `stripdown`              | bool    | Windows only. Whether to reduce the size of the SDK, before caching. | false | false |
| `install_swiftshader`    | bool    | Windows only. Installs Google's SwiftShader software rasterizer. Default: false. | false | false
| `swiftshader_destination`| String  | The installation folder for SwiftShader. | Windows: `C:\swiftshader`. Linux/MacOS: `%HOME/swiftshader` | false
| `install_lavapipe`       | bool    | Windows only. Installs Mesa's Lavapipe software rasterizer. Default: false. | false
| `lavapipe_destination`   | String  | The installation folder for Lavapipe.    | Windows: `C:\lavapipe`. Linux/MacOS: `%HOME/lavapipe` | false
| `github_token`           | String  | The Github token (github_token: ${{ secrets.GITHUB_TOKEN }}). | -- | false

The GitHub token is only needed if your workflow makes more than 60 API requests, such as when using a large build matrix or building often.
The GitHub token is needed by this action to fetch the latest release of a repository via the API (org/repo/releases/latest).

### Outputs

The following output variables are available:

| Name               | Type    | Description                           |
|--------------------|---------|---------------------------------------|
| `VULKAN_VERSION`   | String  | The installed Vulkan SDK version.     |
| `VULKAN_SDK`       | String  | The location of your Vulkan SDK files |

### Environment Variables

The following environment variables are set:

| Name                | Type    |  Description                                               |
|---------------------|---------|------------------------------------------------------------|
| `VULKAN_VERSION`    | String  | The installed Vulkan SDK version.                          |
| `VULKAN_SDK`        | String  | The location of your Vulkan SDK files                      |
| `VK_LAYER_PATH`     | String  | Linux only: The location of /share/vulkan/explicit_layer.d |
| `LD_LIBRARY_PATH`   | String  | Linux only: path to vulkan library                         |
| `DYLD_LIBRARY_PATH` | String  | Mac only: path to vulkan library                           |
| `VK_DRIVER_FILES`   | String  | Location of the Vulkan driver files, semi-colon separated  |

## About Vulkan and the Vulkan SDK

### What is Vulkan?

> The [Khronos Vulkan API](https://khronos.org/registry/vulkan) is an explicit, low-overhead, cross-platform graphics and compute API. Vulkan provides applications with control over the system execution and the system memory to maximize application efficiency on a wide variety of devices from PCs and consoles to mobile phones and embedded platforms.
>
> The Vulkan SDK enables Vulkan developers to develop Vulkan applications.
>

Links: <https://vulkan.org/> | [Vulkan SDK](https://vulkan.lunarg.com/) | [Vulkan SDK Docs](https://vulkan.lunarg.com/doc/sdk/) | [Vulkan Tools](https://vulkan.org/tools) | [Vulkan @ gpuinfo](https://vulkan.gpuinfo.org/)

### What is the Vulkan SDK?

The Vulkan Software Development Kit (SDK) is a collection of tools, libraries,
headers, and validation layers needed to develop Vulkan applications.

It includes:

- Vulkan API headers: Required for compiling Vulkan applications.
- Validation layers: Help debug and validate Vulkan API usage.
- SPIR-V tools: For compiling and optimizing shader code.
- Sample code and documentation: To help developers learn Vulkan.
- Loader and drivers: Ensures proper Vulkan function dispatch.

The Vulkan SDK is provided by LunarG and is essential for developers who want
to build and test Vulkan-based applications.

### What is the Vulkan SDK for ARM?

The Vulkan SDK for ARM is an unofficial custom build SDK based on the official
tarballs for Linux and build on Github Actions runners
(ubuntu-24.04-arm, ubuntu-22.04-arm).

The installer uses releases from https://github.com/jakoch/vulkan-sdk-arm.

Currently (02-2025), KHRONOS has no plans to modify the official tarball to
include prebuilt ARM binaries or to release or update the Ubuntu packages for ARM.

### What is the Vulkan Runtime?

The Vulkan Runtime (VulkanRT) refers to the essential Vulkan libraries and
drivers installed on a system, allowing Vulkan applications to run.

It typically includes:

- The Vulkan loader: Manages Vulkan function calls and interfaces with GPU drivers.
- Runtime libraries: Required to execute Vulkan applications.

Unlike the SDK, the Vulkan Runtime is typically installed automatically
by your GPU driver (from NVIDIA, AMD, or Intel) and is needed for running
Vulkan applications.

This installer enables you to install the latest Vulkan Runtime for development,
allowing you to test your applications with the most up-to-date runtime and
bundle it for redistribution when packaging your application.

### What are Installable Client Drivers (ICDs)?

An ICD is the real Vulkan driver provided by a GPU vendor (or software rasterizer)
that implements the Vulkan API.

When an application calls Vulkan functions (like vkCreateInstance()),
those calls go through the Vulkan loader, which then passes them
to one or more ICDs that are installed on the system.

Each ICD is described by a small JSON file, for example:

```
C:\lavapipe\share\vulkan\icd.d\lvp_icd.x86_64.json
C:\SwiftShader\vk_swiftshader_icd.json
```

These JSON files tell the Vulkan loader:
- the path to the driver file
- the architecture (x64, arm64)
- and contain additional metadata, like version or entrypoint

In order to work with a driver, you have to register them in the Windows registry.

- [Vulkan LoaderDriverInterface](https://vulkan.lunarg.com/doc/view/latest/mac/LoaderDriverInterface.html)

#### Typical Driver Loading Flow

When you run the Vulkan Info Tool (`vulkaninfoSDK.exe`):

1. The Vulkan loader checks the registry at `HKEY_LOCAL_MACHINE\SOFTWARE\Khronos\Vulkan\Drivers`.
2. It finds all .json ICD files listed there.
3. It loads each ICD and queries its capabilities (e.g., from AMD, NVIDIA, Intel, SwiftShader, Lavapipe, etc.).
4. It reports back all devices and properties in your system.

### Where to find Vulkan Documentation?

#### Vulkan Specification

- [HTML](https://vulkan.lunarg.com/doc/view/latest/windows/antora/spec/latest/index.html)
- [PDF](https://registry.khronos.org/vulkan/specs/latest/pdf/vkspec.pdf)

#### Vulkan Docs

- [Vulkan Documentation](https://docs.vulkan.org/spec/latest/index.html)
- [Khronos Vulkan Registry](https://registry.khronos.org/vulkan/)
- [vulkan.gpuinfo.org by Sascha Willems](https://vulkan.gpuinfo.org/)

#### Vulkan SDK

- Vulkan SDK: [Release Notes](https://vulkan.lunarg.com/doc/sdk/latest/windows/release_notes.html?ref=vkconfig), [Download Page](https://vulkan.lunarg.com/sdk/home?ref=vkconfig), [API](https://vulkan.lunarg.com/content/view/latest-sdk-version-api)
- Vulkan Configurator: [Readme](https://github.com/LunarG/VulkanTools/blob/main/vkconfig_gui/README.md), [Changelog](https://github.com/LunarG/VulkanTools/blob/main/vkconfig_gui/CHANGELOG.md)
- Vulkan Loader: [Layer Configuration](https://vulkan.lunarg.com/doc/view/latest/windows/layer_configuration.html?ref=vkconfig), [Loader Debugging Guide](https://github.com/KhronosGroup/Vulkan-Loader/blob/main/docs/LoaderDebugging.md)
- Vulkan Validation Layer: [Readme](https://vulkan.lunarg.com/doc/sdk/1.4.328.1/windows/khronos_validation_layer.html), [Coverage Report / Error Database](https://vulkan.lunarg.com/doc/sdk/latest/windows/validation_error_database.html?ref=vkconfig)
- Vulkan API Capture and Replay - GFXReconstruct: [Usage](https://vulkan.lunarg.com/doc/sdk/1.4.328.1/windows/capture_tools.html)
- Vulkan Profiles Toools: [Overview](https://github.com/KhronosGroup/Vulkan-Profiles/blob/main/OVERVIEW.md), [Changelog](https://github.com/KhronosGroup/Vulkan-Profiles/blob/main/CHANGELOG.md), [Whitepaper](https://www.lunarg.com/wp-content/uploads/2024/04/The-Vulkan-Profiles-Tools-LunarG-Christophe-Riccio-04-11-2024.pdf?ref=vkconfig)

#### Vulkan Community

- [Vulkan Discord](https://discord.com/invite/vulkan), [Reddit](https://www.reddit.com/r/vulkan/), [StackOverflow](https://stackoverflow.com/questions/tagged/vulkan), [Mastodon](https://fosstodon.org/@vulkan)

- Community Layers and Tools: [Vulkan Introspection Layer](https://github.com/nyorain/vil), [MangoHud](https://github.com/flightlessmango/MangoHud)

## Software Rasterisers

This action allows you to optionally install the CPU-based software rasterizers, SwiftShader and Lavapipe, which enable Vulkan API rendering on systems without dedicated GPU hardware.

### SwiftShader

#### What is SwiftShader?

[Swiftshader](https://github.com/google/swiftshader), developed by Google,
delivers a high-performance CPU-based implementation of the Vulkan and
OpenGL ES APIs, ensuring graphics rendering on systems without GPU acceleration.

#### Installing SwiftShader

You can install SwiftShader using `install_swiftshader: true`.

The install location can be changed using `swiftshader_destination`.

The default location for Windows is `C:\Swiftshader`.

The installation folder will contain 3 files:

```
vk_swiftshader.dll
vk_swiftshader_icd.json
vulkan-1.dll
```

#### Registering SwiftShader as Vulkan Driver

To make SwiftShader available as a Vulkan renderer, you must register it as an Installable Client Driver (ICD).

This is done by placing its JSON manifest file, which identifies the ICD and provides the path to the driver DLL, into the Windows registry.

You can do this using PowerShell with the following command:

```
reg add "HKLM\SOFTWARE\Khronos\Vulkan\Drivers" /v "C:\Swiftshader\vk_swiftshader_icd.json" /t REG_DWORD /d 0 /f
```

This allows the Vulkan loader to enumerate SwiftShader among available ICDs and instantiate it as needed by Vulkan applications.

Once registered, you can verify that the driver loads correctly and inspect its capabilities using the Vulkan SDK’s `vulkaninfo` tool:

```
vulkaninfoSDK.exe -j -o swiftshader_profile.json

Get-Content -Raw swiftshader_profile.json
```

This command generates a JSON file (`swiftshader_profile.json`) containing detailed information about the
SwiftShader Vulkan driver, including supported extensions, features, and device properties.

The json file should contain an entry `capabilities.device.properties.VkPhysicalDeviceProperties` with a line similar to:
`"deviceName": "SwiftShader Device (LLVM 10.0.0)"`.

To confirm that, you can use `jq` to extract the device name:

```
jq -r '.capabilities.device.properties.VkPhysicalDeviceProperties.deviceName' swiftshader_profile.json
```

This should output a line similar too:

```
SwiftShader Device (LLVM 10.0.0)
```

### LLVMPipe and Lavapipe

#### What is LLVMpipe? What is Lavapipe?

Mesa's LLVMpipe is a CPU-based software rasterizer in the Mesa 3D Graphics Library that enables OpenGL rendering without dedicated GPU hardware.
It leverages the LLVM compiler infrastructure to translate graphics operations, including vertex processing, shader execution,
and rasterization of points, lines, and triangles, into LLVM Intermediate Representation (IR).
This IR is then dynamically compiled into optimized machine code for the host CPU architecture (such as x86, x86_64, or ppc64le),
delivering a flexible and performant fallback renderer for systems lacking GPU support.

Mesa's Lavapipe is CPU-based software driver for the Vulkan API.
Like LLVMpipe, it uses LLVM to compile Vulkan shaders into native machine code, providing a fully functional Vulkan
implementation that runs entirely on the CPU. Lavapipe serves as a critical fallback for environments without compatible
GPU drivers, such as virtual machines or headless systems, ensuring Vulkan applications can still run when no hardware acceleration is available.

In short:
- LLVMpipe = OpenGL on the CPU
- Lavapipe = Vulkan on the CPU

As this action focuses on providing the Vulkan SDK and drivers, we focus on the installation of Lavapipe.

#### Installing Lavapipe

You can install Lavapipe using `install_lavapipe: true`.

The install location can be changed using `lavapipe_destination`.

The default location for Windows is `C:\Lavapipe`.

The installation folder will contain 3 files:

```
vulkan_lvp.dll
vulkan_lvp.lib
share\vulkan\icd.d\lvp_icd.x86_64.json
```

#### Registering Lavapipe as Vulkan Driver

To make Lavapipe available as a Vulkan renderer, you must register it as an Installable Client Driver (ICD).

This is done by placing its JSON manifest file, which identifies the ICD and provides the path to the driver DLL, into the Windows registry.

You can do this using PowerShell with the following command:

```
reg add "HKLM\SOFTWARE\Khronos\Vulkan\Drivers" /v "C:\lavapipe\share\vulkan\icd.d\lvp_icd.x86_64.json" /t REG_DWORD /d 0 /f
```

This allows the Vulkan loader to enumerate Lavapipe among available ICDs and instantiate it as needed by Vulkan applications.

Once registered, you can verify that the driver loads correctly and inspect its capabilities using the Vulkan SDK’s `vulkaninfo` tool:

```
vulkaninfoSDK.exe -j -o lavapipe_profile.json

Get-Content -Raw lavapipe_profile.json
```

This command generates a JSON file (`lavapipe_profile.json`) containing detailed information about the
SwiftShader Vulkan driver, including supported extensions, features, and device properties.

The json file should contain an entry `capabilities.device.properties.VkPhysicalDeviceProperties` with a line similar to:
`"deviceName": "llvmpipe (LLVM 21.1.4, 256 bits)"`.

To confirm that, you can use `jq` to extract the device name:

```
jq -r '.capabilities.device.properties.VkPhysicalDeviceProperties.deviceName' lavapipe_profile.json
```

This should output a line similar too:
```
llvmpipe (LLVM 21.1.4, 256 bits)
```

### Troubleshooting Loader Issues

The Vulkan loader has added logging functionality that can be enabled by using the `VK_LOADER_DEBUG` environment variable.

```
set VK_LOADER_DEBUG=error,warn,info
```

See [Loader Debugging](https://vulkan.lunarg.com/doc/view/latest/windows/LoaderDebugging.html).

## License

All the content in this repository is licensed under the [MIT License](https://github.com/jakoch/install-vulkan-sdk-action/blob/main/LICENSE).

Copyright (c) 2021 Jens A. Koch

## Development Notes

This section contains development field notes and acts as reminder for other devs and myself.

### How to make a new release?

- **Step 1.** Bump version number in package.json
- **Step 2.** Run `npm run npm:install` to install the dependencies
- **Step 3.** Run `npm run all` to generate a bundled package in dist
  - or simply open `package.json` and click the desired command via script section
- **Step 4.** Update changelog
- **Step 5.** Commit the changes, including the dist folder, then push
- **Step 6.** Tag the commit with the full version number:

  ```bash
  git tag v1.2.3
  git push origin v1.2.3
  ```

- **Step 7.** Force push the `v1` tag to this commit:

  ```bash
  git tag -f v1
  git push origin v1 -f
  ```
