[![GitHub Releases](https://img.shields.io/github/release/jakoch/install-vulkan-sdk-action.svg?style=flat-square)](https://github.com/jakoch/install-vulkan-sdk-action/releases/latest)
[![GitHub Workflow Status](https://github.com/jakoch/install-vulkan-sdk-action/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/jakoch/install-vulkan-sdk-action/actions/workflows/build.yml)

# Github Action: Install Vulkan SDK

A Github Action to install the Vulkan SDK and it's runtime.

- This action can be used to install the Vulkan SDK in your Github Action workflows.
- The SDK version number is automatically fetched via the Web API, if not set to a fixed version number manually (latest).
- The installation of optional SDK components is supported.
- The size of the installed SDK is reduced to achieve a smaller cache package size (only on Windows).
- The installer supports runners for Windows, Linux, macOS, Windows-ARM, and Linux-ARM.

---

- [Github Action: Install Vulkan SDK](#github-action-install-vulkan-sdk)
  - [About Vulkan](#about-vulkan)
    - [What is Vulkan?](#what-is-the-vulkan-sdk)
    - [What is the Vulkan SDK?](#what-is-the-vulkan-sdk)
    - [What is the Vulkan SDK for ARM?](#what-is-the-vulkan-sdk-for-arm)
    - [What is the Vulkan Runtime?](#what-is-the-vulkan-runtime)
  - [Usage](#usage)
    - [Quick start](#quick-start)
  - [Action Reference](#action-reference)
    - [Inputs](#inputs)
    - [Outputs](#outputs)
    - [Environment Variables](#environment-variables)
  - [License](#license)

## About Vulkan

### What is Vulkan?

> The [Khronos Vulkan API](https://khronos.org/registry/vulkan) is an explicit, low-overhead, cross-platform graphics and compute API. Vulkan provides applications with control over the system execution and the system memory to maximize application efficiency on a wide variety of devices from PCs and consoles to mobile phones and embedded platforms.
>
> The Vulkan SDK enables Vulkan developers to develop Vulkan applications.
>

Links: <https://vulkan.org/> | [Vulkan SDK](https://vulkan.lunarg.com/) | [Vulkan SDK Docs](https://vulkan.lunarg.com/doc/sdk/) | [Vulkan Tools](https://vulkan.org/tools) | [Vulkan @ gpuinfo](https://vulkan.gpuinfo.org/)

## What is the Vulkan SDK?

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

## What is the Vulkan SDK for ARM?

The Vulkan SDK for ARM is an unofficial custom build SDK based on the official
tarballs for Linux and build on Github Actions runners
(ubuntu-24.04-arm, ubuntu-22.04-arm).

The installer uses releases from https://github.com/jakoch/vulkan-sdk-arm.

Currently (02-2025), KHRONOS has no plans to modify the official tarball to
include prebuilt ARM binaries or to release or update the Ubuntu packages for ARM.

## What is the Vulkan Runtime?

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

## Usage

### Quick start

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
          # The installer supports the target platform,
          # but Github Actions doesn't provide the runner, yet.
          # It's expected in Q2 2025.
          # - { name: "Windows 2025 Arm", os: windows-2025-arm }

    steps:
      - name: Install Vulkan SDK
        uses: jakoch/install-vulkan-sdk-action@v1.1.0
        with:
          # You can set the Vulkan SDK version to download.
          # Defaults to latest version, if version not set.
          vulkan_version: 1.3.231.1
          optional_components: com.lunarg.vulkan.vma
          install_runtime: true
          cache: true
          stripdown: true

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
| `install_runtime`        | bool    | Windows only. Installs the vulkan runtime ('vulkan-1.dll') into a `runtime` folder inside `destination`, if true. Windows: `C:\VulkanSDK\runtime`.    | true | false |
| `cache`                  | bool    | Cache the Vulkan installation folder.   | true | false |
| `stripdown`              | bool    | Windows only. Weather to reduce the size of the SDK, before caching. | false | false |
| `install_swiftshader`    | bool    | Windows only. Installs Google's SwiftShader software rasterizer. Default: false. | false | false
| `swiftshader_destination`| String  | The installation folder for SwiftShader. | Windows: `C:\swiftshader`. Linux/MacOS: `%HOME/swiftshader` | false
| `install_lavapipe`       | bool    | Windows only. Installs Mesa's Lavapipe software rasterizer. Default: false. | false
| `lavapipe_destination`   | String  | The installation folder for Lavapipe.    | Windows: `C:\lavapipe`. Linux/MacOS: `%HOME/lavapipe` | false

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

## Features

- Installs SDK
- Installs Runtime using automatic download retry and version lowering

## License

All the content in this repository is licensed under the [MIT License](https://github.com/jakoch/install-vulkan-sdk-action/blob/main/LICENSE).

Copyright (c) 2021 Jens A. Koch

## Development Reminder

To make a new release:

- **Step 1.** Bump version number in package.json
- **Step 2.** Run `npm run npm_install` to install the dependencies
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
