cmake_minimum_required(VERSION 3.22.1)
project(node_bridge LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT DEFINED NODE_MOBILE_DIR)
    message(FATAL_ERROR "NODE_MOBILE_DIR is required")
endif()

add_library(libnode SHARED IMPORTED)
set_target_properties(
    libnode
    PROPERTIES
    IMPORTED_LOCATION "${NODE_MOBILE_DIR}/bin/${ANDROID_ABI}/libnode.so"
)

add_library(
    node_bridge
    SHARED
    node_bridge.cpp
)

target_include_directories(
    node_bridge
    PRIVATE
    "${NODE_MOBILE_DIR}/include/node"
)

find_library(log_lib log)

target_link_options(
    node_bridge
    PRIVATE
    "-Wl,-z,max-page-size=16384"
)

target_link_libraries(
    node_bridge
    PRIVATE
    libnode
    ${log_lib}
)
