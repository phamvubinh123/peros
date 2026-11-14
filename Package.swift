// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Peros",
    platforms: [.macOS(.v26)],
    targets: [
        // Rules and data logic with no SwiftUI.
        .target(name: "PerosKit"),
        .executableTarget(
            name: "Peros",
            dependencies: ["PerosKit"],
            // App code runs on the main thread unless you say otherwise.
            swiftSettings: [.defaultIsolation(MainActor.self)]
        ),
    ]
)
