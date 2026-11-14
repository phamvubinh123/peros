import AppKit
import PerosKit
import SwiftUI

// Peros
//   Peros                      the app
//   APP_STORE=<file> Peros     use another database (tests, experiments)
//   APP_SNAPSHOT=<dir> Peros   save a PNG of every sidebar page and Settings tab in light and dark mode, then quit
//   APP_SEED=1 Peros           fill an empty /tmp store with sample items (tools/snap.sh)
//   Peros --selftest           run the self-test on a /tmp store and quit with 0 or 1 (tools/selftest.sh)
//   APP_ACCENT=<id> Peros      run with another accent from Theme.all (UI/Theme.swift)
//   APP_GRID=1 Peros           draw the 8 pt grid and the layout probes over the window

@main
struct PerosApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    private let model = AppModel()
    @Environment(\.openWindow) private var openWindow

    var body: some Scene {
        Window("Peros", id: "main") {
            ContentView()
                .environment(model)
                .themed()
                .overlay { if GridOverlay.enabled { GridOverlay() } }
                .frame(minWidth: 1020, minHeight: 680)
        }
        .defaultSize(width: 1320, height: 840)
        .windowToolbarStyle(.unified)
        .commands {
            SidebarCommands()
            ToolbarCommands()
            CommandGroup(replacing: .newItem) {
                Button("Start Focus Hour") {
                    model.sidebar = .today
                    if model.currentStep == .chooseOutcome {
                        model.startFocusHour()
                    }
                }
                .keyboardShortcut("n")

                Button("Log Distraction") {
                    if model.isFocusing {
                        model.recordDistraction()
                    }
                }
                .keyboardShortcut("d")
            }
        }

        Settings {
            SettingsView()
                .environment(model)
                .themed()
        }
        .windowResizability(.contentSize)

        MenuBarExtra {
            VStack(alignment: .leading, spacing: Space.sm) {
                HStack {
                    Text(model.isFocusing ? "Hour \(model.activeSlotIndex) of \(model.data.dailyGoal)" : "Peros Focus")
                        .font(.headline)
                    Spacer()
                    Text(model.menuBarLabel)
                        .font(.system(.body, design: .monospaced).weight(.semibold))
                        .foregroundStyle(Palette.accentText)
                }

                if model.isFocusing {
                    Text(model.draftOutcome)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)

                    HStack(spacing: Space.xs) {
                        Button("Log Distraction (\(model.activeDistractions))") {
                            model.recordDistraction()
                        }
                        .buttonStyle(.borderedProminent)
                        Button(model.isTimerPaused ? "Resume" : "Pause") {
                            model.togglePause()
                        }
                        .buttonStyle(.bordered)
                    }
                }

                Divider()

                Button("Open Peros") {
                    NSApp.activate()
                    openWindow(id: "main")
                }
                Button("Quit Peros") {
                    NSApp.terminate(nil)
                }
            }
            .padding(Space.md)
            .frame(width: 260)
            .themed()
        } label: {
            Label(model.menuBarLabel, systemImage: model.isFocusing ? "timer" : "scope")
        }
        .menuBarExtraStyle(.window)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationWillTerminate(_ notification: Notification) {
        if SelfTest.requested { exit(SelfTest.exitCode) }
    }
}

/// Where the data lives: ~/Library/Application Support/Peros/peros.json
enum Store {
    static var isOverridden: Bool {
        !(ProcessInfo.processInfo.environment["APP_STORE"] ?? "").isEmpty
    }

    static var url: URL {
        if let path = ProcessInfo.processInfo.environment["APP_STORE"], !path.isEmpty {
            return URL(fileURLWithPath: path)
        }
        let dir = URL.applicationSupportDirectory.appending(path: "Peros", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appending(path: "peros.json")
    }

    static func load(from url: URL) -> PerosStoreData {
        guard let data = try? Data(contentsOf: url) else { return PerosStoreData() }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode(PerosStoreData.self, from: data)) ?? PerosStoreData()
    }

    static func save(_ storeData: PerosStoreData, to url: URL) {
        let dir = url.deletingLastPathComponent()
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        if let data = try? encoder.encode(storeData) {
            try? data.write(to: url, options: .atomic)
        }
    }
}
