import AppKit
import Foundation
import PerosKit

/// Self-test for agents: runs the app's real functions on a /tmp store,
/// prints PASS or FAIL per check, and quits with exit code 0 or 1.
@MainActor
enum SelfTest {
    static var requested: Bool { CommandLine.arguments.contains("--selftest") }
    static var exitCode: Int32 = 0
    private static var failures = 0
    private static var count = 0

    static func runIfRequested(model: AppModel) {
        guard requested else { return }
        setvbuf(stdout, nil, _IOLBF, 0)
        guard Store.isOverridden else {
            print("SELFTEST refused: set APP_STORE to a file in /tmp")
            finish(code: 1)
            return
        }
        Task {
            try? await Task.sleep(for: .seconds(0.3))
            let before = model.data.hours.count

            // 1. Focus lifecycle
            model.draftOutcome = "  Write   launch post "
            model.startFocusHour(durationSeconds: 3600)
            check("starting focus transitions to step 2", model.currentStep == .focus)
            model.recordDistraction(cause: .phone)
            model.recordDistraction(cause: .newTab)
            model.recordDistraction(cause: .phone)
            check("distractions count increments", model.activeDistractions == 3)
            model.finishFocusEarly()
            check("finishing early transitions to record", model.currentStep == .record)
            model.saveHourResult(.done)
            check("saving hour increments stored hours", model.data.hours.count == before + 1)
            check("saving hour transitions to rest", model.currentStep == .restReview)
            if let last = model.data.hours.last {
                check("top distraction cause is phone", last.topCause == .phone)
            }
            model.finishBreakAndAdvance()
            check("finishing break returns to chooseOutcome", model.currentStep == .chooseOutcome)

            // 2. PerosKit pure logic checks
            check("countdown formats 41:12", FocusAnalytics.formatCountdown(2472) == "41:12")
            check("countdown clamps negative", FocusAnalytics.formatCountdown(-10) == "00:00")
            let grid = FocusAnalytics.weeklyHeatmap(hours: model.allSnapshots, weeks: 12)
            check("heatmap has 12 weeks x 7 days", grid.count == 12 && grid.allSatisfy { $0.count == 7 })
            let csv = FocusAnalytics.csvExport(hours: model.allSnapshots)
            check("csv export contains outcome", csv.contains("Write launch post"))

            print(failures == 0 ? "SELFTEST PASS \(count) checks" : "SELFTEST FAIL \(failures) of \(count) checks")
            finish(code: failures == 0 ? 0 : 1)
        }
    }

    private static func check(_ name: String, _ ok: Bool, _ detail: String = "") {
        count += 1
        if !ok { failures += 1 }
        print(ok ? "PASS \(name)" : "FAIL \(name)\(detail.isEmpty ? "" : ": \(detail)")")
    }

    static func finish(code: Int32) {
        exitCode = code
        for window in NSApp.windows { if let sheet = window.attachedSheet { window.endSheet(sheet) } }
        NSApp.terminate(nil)
    }
}
