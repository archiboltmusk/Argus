// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ArgusApple",
    platforms: [
        .tvOS(.v16),
        .watchOS(.v9),
        .visionOS(.v1),
    ],
    products: [
        .executable(name: "ArgusTV", targets: ["ArgusTV"]),
        .executable(name: "ArgusVision", targets: ["ArgusVision"]),
    ],
    dependencies: [
        .package(url: "https://github.com/mpvkit/MPVKit.git", from: "1.0.0"),
    ],
    targets: [
        .executableTarget(
            name: "ArgusTV",
            dependencies: [.product(name: "MPVKit", package: "MPVKit")],
            path: "ArgusTV"
        ),
        .executableTarget(
            name: "ArgusVision",
            dependencies: [.product(name: "MPVKit", package: "MPVKit")],
            path: "ArgusVision"
        ),
    ]
)
