#include <vulkan/vulkan.h>
#include <cstdio>
#include <cstdlib>

int main()
{
    // Print Vulkan header version
    std::printf("Vulkan header version: %u (%u.%u.%u)\n",
        VK_HEADER_VERSION_COMPLETE,
        VK_API_VERSION_MAJOR(VK_HEADER_VERSION_COMPLETE),
        VK_API_VERSION_MINOR(VK_HEADER_VERSION_COMPLETE),
        VK_API_VERSION_PATCH(VK_HEADER_VERSION_COMPLETE));

    // Print Vulkan runtime version
    uint32_t apiVersion = 0;
    PFN_vkEnumerateInstanceVersion vkEnumerateInstanceVersion =
        reinterpret_cast<PFN_vkEnumerateInstanceVersion>(
            vkGetInstanceProcAddr(nullptr, "vkEnumerateInstanceVersion"));
    if (vkEnumerateInstanceVersion) {
        vkEnumerateInstanceVersion(&apiVersion);
        std::printf("Vulkan runtime version: %u.%u.%u\n",
            VK_API_VERSION_MAJOR(apiVersion),
            VK_API_VERSION_MINOR(apiVersion),
            VK_API_VERSION_PATCH(apiVersion));
    } else {
        std::printf("Vulkan runtime version: 1.0 (vkEnumerateInstanceVersion unavailable)\n");
    }

    // List Vulkan instance extensions
    uint32_t extensionCount = 0;
    VkResult result = vkEnumerateInstanceExtensionProperties(nullptr, &extensionCount, nullptr);
    if (result != VK_SUCCESS) {
        std::fprintf(stderr, "vkEnumerateInstanceExtensionProperties failed: %d\n", result);
        return EXIT_FAILURE;
    }
    std::printf("Vulkan instance extension count: %u\n", extensionCount);

    std::printf("Vulkan integration test PASSED\n");

    return EXIT_SUCCESS;
}
