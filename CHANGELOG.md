# Changelog

All changes to the project will be documented in this file.

- The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
- The date format is YYYY-MM-DD.
- The upcoming release version is named `vNext` and links to the changes between latest version tag and git HEAD.

## [vNext] - unreleased

- "It was a bright day in April, and the clocks were striking thirteen." - 1984

## [1.3.0] - 2026-06-01

### Added
- Added caching to installer_swiftshader and installer_lavapipe, [#492](https://github.com/jakoch/install-vulkan-sdk-action/issues/492)

### Changed
- The method github.getLatestRelease() was changed to also allow API Auth using
  GITHUB_TOKEN and avoid hitting the rate-limit. The method will now work with
  and without TOKEN auth. [#544](https://github.com/jakoch/install-vulkan-sdk-action/issues/544)

## [1.2.8] - 2025-10-31

### Added
- Added `install_runtime_only`, which allows the user to only install the Vulkan Runtime Components
  without installing the full Vulkan SDK, [#530](https://github.com/jakoch/install-vulkan-sdk-action/issues/530)
  This flag implicitly sets `install_runtime` to `true`.
- Added SHA hash verification of downloaded Vulkan SDK files
- Added more tests

## [1.2.7] - 2025-10-13

### Fixed
- Updated workflow, because lowest available version is 1.3.268.0 (all older version are removed)

## [1.2.6] - 2025-09-22

### Fixed
- Updated `getCacheKeys` function to remove the installation path parameter.
- Modified `getVulkanSdk` to align with the new `getCacheKeys` signature.
- Adjusted Vulkan runtime installation calls to match updated parameters.
- Ensured proper handling of latest version retrieval in `getLatestVersionsJson`.
- Improved error handling in `getLowerVersion` to return a rejected promise for empty version lists.
- Added tests for unsupported platforms in the `extract` function.
- Added more tests

## [1.2.5] - 2025-06-12

### Fixed

- fixes for "Vulkan Runtime for Windows" installation and "deprecation of the standalone RT installer" (#500)
  The Vulkan runtime is installed into system folders by the Vulkan SDK installer.
  We copy these files back into the "VulkanSDK/version/runtime/{x86|x64}" folder.
  This is the installation we used with the standalone RT installer.
  This is done to ensure backwards compatibility with CI steps, which copy files from this location.
- fixed verifyInstallationOfRuntime() to detect the runtime files correctly

## [1.2.4] - 2025-06-11

### Fixed

- added version detection to the installation of Vulkan Runtime on Windows (x64, arm64)
  as the standalone installer is deprecated. last version 1.4.313.0., [#500](https://github.com/jakoch/install-vulkan-sdk-action/issues/500)

### Changed

- updated SDK installer component list to include the cross compile lib components:
  `com.lunarg.vulkan.arm64` and `com.lunarg.vulkan.x64`, [#499](https://github.com/jakoch/install-vulkan-sdk-action/pull/499)

## [1.2.3] - 2025-05-06

### Fixed

- fixed MAC Installer filename
- fixed ubuntu-24.04-arm release not found
- fix path for Vulkan Runtime detection on Windows

## [1.2.2] - 2025-05-06

### Fixed

- fixed SDK Installer filename for Windows downloads, [#498](https://github.com/jakoch/install-vulkan-sdk-action/issues/498)

## [1.2.1] - 2025-05-03

### Fixed

- fixed platform detection issue for new windows-11-arm runners, [#496](https://github.com/jakoch/install-vulkan-sdk-action/issues/496)

## [1.2.0] - 2025-03-16

### Added

- the action supports the installation of the software rasterizers SwiftShader and Lavapipe, [#425](https://github.com/jakoch/install-vulkan-sdk-action/issues/425)
- added `husky` for pre-commits to devDependencies
- added pre-commit hook, which runs precommit script and adds `dist/**` folder
- added `orta.vscode-jest` as vscode extension to the devcontainer
- added tests and increased coverage
- added coverage upload to codecov.io

### Changed
- adjusted the Jest configuration to generate coverage information
  based on the `/src` folder, not exclusively on the existing test files
- fixed VK_LAYER_PATH, use `share` instead of `etc`: `.../share/vulkan/explicit_layer.d`

## [1.1.1] - 2025-02-13

- handle versionised installer name on MACOS, [#489](https://github.com/jakoch/install-vulkan-sdk-action/issues/489)
- handle missing runtime releases for Windows gracefully, [#488](https://github.com/jakoch/install-vulkan-sdk-action/issues/488)
- fix invalid dates in changelog (v1.0.6, v1.1.0)
- fix invalid version in package.json (v1.0.6)

## [1.1.0] - 2025-02-04

### Added
- install Vulkan SDK for MACOS, [#293](https://github.com/jakoch/install-vulkan-sdk-action/issues/293)
- install Vulkan SDK for ARM64 (aarch64) on Windows and Linux, [#487](https://github.com/jakoch/install-vulkan-sdk-action/issues/487)

### Changed
- moved downloader.is_downloadable() to http.isDownloadable()
- moved downloader.compareVersionNumbers() to versions.compare()
- applied changes according to "useNamingConvention"
- renamed file versiongetter.ts to versions_vulkan.ts and updated symbols
- renamed installer.ts to installer_vulkan.ts and updated symbols

## [1.0.6] - 2025-01-30

### Added
- added biome
- updated install verify step: if vulkaninfo exists, run "vulkaninfo --summary"

### Changed
- updated devcontainer incl. Dockerfile
- renamed __tests__ folder to tests
- removed eslint and prettier
- fixed linter and formatting issues found by biome

## [1.0.5] - 2024-12-06

## Fixed

- Add vulkansdk/bin to path, #453

## [1.0.4] - 2024-06-15

## Fixed

- Runtime Warning given while running with install_runtime: false, #416

## [1.0.3] - 2024-02-20

### Changed

- action: raised Node version to 20

## [1.0.2] - 2024-02-15

### Added

- action:
  - handle extraction of "tar.xz" archives, because archive type changed
    - "tar.xz" for all versions greater      1.3.261.1
    - "tar.gz" for all versions lesser/equal 1.3.250.1
- github workflows:
  - allow manual workflow triggering

### Changed

- devcontainer:
  - updated container image to node:21-bookworm-slim

## [1.0.1] - 2023-09-28

- added Changelog
- fixed "vulkan_version" to be not required and default to "latest" version
- improved docblocks

## [1.0.0] - 2023-09-25

- install and cache Vulkan SDK on Windows and Linux

## [0.9.0] - 2023-01-31

- first release
- conversion from bash and GHA action to a Typescript based action

<!-- Section for Reference Links -->

[vNext]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.2.8...v1.3.0
[1.2.8]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.2.7...v1.2.8
[1.2.7]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.0.6...v1.1.0
[1.0.6]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jakoch/install-vulkan-sdk-action/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/jakoch/install-vulkan-sdk-action/releases/tag/v0.9.0
