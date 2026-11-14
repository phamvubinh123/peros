import XCTest
@testable import PerosKit

final class FocusAnalyticsTests: XCTestCase {
    func testFormatsCountdown() {
        XCTAssertEqual(FocusAnalytics.formatCountdown(3600), "60:00")
        XCTAssertEqual(FocusAnalytics.formatCountdown(2472), "41:12")
        XCTAssertEqual(FocusAnalytics.formatCountdown(-5), "00:00")
    }

    func testComputesCapacityAndHeatmap() {
        let cal = Calendar(identifier: .gregorian)
        let today = cal.startOfDay(for: .now)
        let hours = [
            HourSnapshot(date: today, slotIndex: 1, outcome: "Draft spec", distractionsCount: 2, topCause: .phone, result: .done),
            HourSnapshot(date: today, slotIndex: 2, outcome: "Build UI", distractionsCount: 1, topCause: .newTab, result: .done),
        ]
        let summary = FocusAnalytics.capacitySummary(
            hours: hours,
            dailyGoal: 2,
            autoLevelUp: false,
            countWeekends: true,
            referenceDate: today,
            calendar: cal
        )
        XCTAssertEqual(summary.currentHoursPerDay, 2)
        XCTAssertEqual(summary.daysHitInLast7, 1)
        XCTAssertEqual(summary.tiers[0].state, .passed)
        XCTAssertEqual(summary.tiers[1].state, .current)
        XCTAssertEqual(summary.tiers[2].state, .locked)

        let grid = FocusAnalytics.weeklyHeatmap(hours: hours, weeks: 12, referenceDate: today, calendar: cal)
        XCTAssertEqual(grid.count, 12)
        XCTAssertTrue(grid.allSatisfy { $0.count == 7 })
    }

    func testExportsCsvSafely() {
        let hour = HourSnapshot(
            date: Date(timeIntervalSince1970: 1_760_000_000),
            slotIndex: 1,
            outcome: "Draft \"pricing\" page",
            distractionsCount: 3,
            topCause: .phone,
            result: .done
        )
        let csv = FocusAnalytics.csvExport(hours: [hour])
        XCTAssertTrue(csv.contains("\"Draft \"\"pricing\"\" page\""))
        XCTAssertTrue(csv.contains(",3,Phone,"))
    }
}
