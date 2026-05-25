cmake_minimum_required(VERSION 3.10)
project(VulkanIntegrationTest CXX)

find_package(Vulkan REQUIRED)

message(STATUS "Vulkan found: ${Vulkan_FOUND}")
message(STATUS "Vulkan libraries: ${Vulkan_LIBRARIES}")
message(STATUS "Vulkan include dir: ${Vulkan_INCLUDE_DIR}")
message(STATUS "Vulkan version: ${Vulkan_VERSION}")

add_executable(vulkan_integration_test main.cpp)
target_include_directories(vulkan_integration_test PRIVATE ${Vulkan_INCLUDE_DIR})
target_link_libraries(vulkan_integration_test PRIVATE ${Vulkan_LIBRARIES})
