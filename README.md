[![GitHub Releases](https://img.shields.io/github/release/jakoch/install-vulkan-sdk-action.svg?style=flat-square)](https://github.com/jakoch/install-vulkan-sdk-action/releases/latest)
[![GitHub Marketplace](https://img.shields.io/badge/marketplace-install-vulkan-sdk-action?logo=github&style=flat-square)](https://github.com/marketplace/actions/install-vulkan-sdk-action)
[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/jakoch/install-vulkan-sdk-action/%F0%9F%9A%80%20Build%20and%20Test?label=%F0%9F%9A%80%20Build%20and%20Test&logo=github&style=flat-square)](https://github.com/jakoch/install-vulkan-sdk-action/actions/workflows/build.yml)

# Github Action: Install Vulkan SDK

A Github Action to install the Vulkan SDK and it's runtime.

This action can be used to install the Vulkan SDK in your Github Action workflows.

___

- [Github Action: Install Vulkan SDK](#github-action-install-vulkan-sdk)
  - [Vulkan](#vulkan)
    - [Websites](#websites)
    - [What is Vulkan?](#what-is-vulkan)
  - [Usage](#usage)
    - [Quick start](#quick-start)
  - [Action Reference](#action-reference)
    - [Inputs](#inputs)
    - [Outputs](#outputs)
    - [Environment Variables](#environment-variables)
  - [Keep up-to-date with GitHub Dependabot](#keep-up-to-date-with-github-dependabot)
  - [License](#license)

## Vulkan

### Websites

- <https://vulkan.org/>
- Vulkan SDK: <https://vulkan.lunarg.com/>
- Vulkan SDK Docs: <https://vulkan.lunarg.com/doc/sdk/>
- Vulkan Tools: <https://vulkan.org/tools>
- Vulkan SDK Version Query and Download API: <https://vulkan.lunarg.com/content/view/latest-sdk-version-api>

### What is Vulkan?

> The [Khronos Vulkan API](https://khronos.org/registry/vulkan) is an explicit, low-overhead, cross-platform graphics and compute API. Vulkan provides applications with control over the system execution and the system memory to maximize application efficiency on a wide variety of devices from PCs and consoles to mobile phones and embedded platforms.
>
> The Vulkan SDK enables Vulkan developers to develop Vulkan applications. It includes:
>
> - Vulkan API usage validation thanks to the [Khronos Validation layer](https://vulkan.lunarg.com/doc/view/latest/mac/getting_started.html#user-content-vulkan-api-validation-with-khronos-validation-layer).
> - Vulkan Layers configuration thanks to [Vulkan Configurator](https://vulkan.lunarg.com/doc/view/latest/mac/getting_started.html#user-content-vulkan-configurator).
> - SPIR‑V Shader compilation, optimization and validation thanks to [DXC](https://vulkan.lunarg.com/doc/view/latest/linux/DXC.html), [SPIR‑V Tools](https://vulkan.lunarg.com/doc/view/latest/linux/spirv_toolchain.html), [SPIR‑V Cross](https://vulkan.lunarg.com/doc/view/latest/linux/spirv_toolchain.html#user-content-spir-v-cross-compilation-and-reflection) and [MoltenVKShaderConverter](https://github.com/KhronosGroup/MoltenVK/blob/master/Docs/MoltenVK_Runtime_UserGuide.md#shader_converter_tool) (for MacOS).
> - Vulkan API capture and replay for Vulkan debugging thanks to [GFXReconstruct](https://vulkan.lunarg.com/doc/view/latest/windows/getting_started.html#user-content-vulkan-api-capture-and-replay-with-gfxreconstruct).
> - [Vulkan system report](https://vulkan.lunarg.com/doc/view/1.2.189.2/windows/getting_started.html#user-content-verify-the-sdk-installation) thanks to Vulkan Installation Analyzer (VIA) and Vulkan Info.
> - [Vulkan demos](https://vulkan.lunarg.com/doc/view/1.2.189.2/windows/getting_started.html#user-content-build-the-demo-programs) code.
> - Third-party libraries such as [GLM](https://github.com/g-truc/glm) and [SDL](https://www.libsdl.org/).
>
> -- <cite>https://vulkan.lunarg.com/doc/sdk/latest/windows/getting_started.html</cite>

## Usage

### Quick start

```yaml
jobs:
  build:
    runs-on: ${{ matrix.config.os }}
    strategy:
      matrix:
        config:
          - { name: "Windows", os: windows-latest }
          - { name: "Ubuntu", os: ubuntu-latest }
          - { name: "MacOS", os: macos-latest }

    steps:
      - name: Install VULKAN SDK
        uses: jakoch/install-vulkan-sdk-action@main
        with:
          # You can set the VULKAN SDK version to download.
          # Defaults to latest version, if version not set.
          version: 1.2.198.1

```
## Action Reference

You can find all Inputs and Outputs and their default settings in the [action.yml](https://github.com/jakoch/install-vulkan-sdk-action/blob/main/action.yml) file.

### Inputs

The following inputs can be used as `steps.with` keys:

| Name               | Type    | Description                           | Default                 | Required |
|--------------------|---------|---------------------------------------|-------------------------|----------|
| `version`          | String  | A Vulkan SDK version (eg. `1.2.189.1`). | If `version` is not set, the latest version is used. | false |
| `destination`      | String  | The Vulkan SDK installation folder.     | Windows: `C:\VulkanSDK`. Linux/MacOS: `%HOME` | false |
| `install_runtime`  | bool    | Windows only. Installs the vulkan runtime ('vulkan-1.dll') into a `runtime` folder inside `destination`, if true. Windows: `C:\VulkanSDK\runtime`. | true | false |
| `use_cache`        | bool    | Cache the Vulkan installation folder. | true | false |

### Outputs

The following output variables are available:

| Name               | Type    | Description                           |
|--------------------|---------|---------------------------------------|
| `VULKAN_VERSION`   | String  | The installed Vulkan SDK version.     |
| `VULKAN_SDK`       | String  | The location of your Vulkan SDK files |

### Environment Variables

The following environment variables are set:

| Name            | Type    | Default      | Description                                    |
|-----------------|---------|--------------|------------------------------------------------|
| `VULKAN_SDK`    | String  | `~/.default_value` | The location of your Vulkan SDK files  |

## Keep up-to-date with GitHub Dependabot

Dependabot has native GitHub Actions support.
To enable it for your Github repo you just need to add a `.github/dependabot.yml` file:

    version: 2
    updates:
      # Maintain dependencies for GitHub Actions
      - package-ecosystem: "github-actions"
        directory: "/"
        schedule:
          interval: "weekly"

## License

All the content in this repository is licensed under the [MIT License](https://github.com/jakoch/install-vulkan-sdk-action/blob/main/LICENSE).

Copyright (c) 2021 Jens A. Koch
