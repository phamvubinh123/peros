import Foundation

public enum HourResult: String, Codable, CaseIterable, Sendable, Identifiable {
    case done
    case partly
    case notDone

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .done: "Done"
        case .partly: "Partly"
        case .notDone: "Not done"
        }
    }
}

public enum HourStatus: String, Codable, CaseIterable, Sendable {
    case planned
    case active
    case completed
}

public enum DistractionCause: String, Codable, CaseIterable, Sendable, Identifiable {
    case phone
    case newTab
    case wanderingThought
    case notification
    case person
    case other

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .phone: "Phone"
        case .newTab: "New tab"
        case .wanderingThought: "Wandering thought"
        case .notification: "Notification"
        case .person: "Someone talked to me"
        case .other: "Other"
        }
    }

    public var shortTitle: String {
        switch self {
        case .phone: "Phone"
        case .newTab: "New tab"
        case .wanderingThought: "Thought"
        case .notification: "Notification"
        case .person: "Person"
        case .other: "Other"
        }
    }
}

public enum RitualPeriod: String, Codable, CaseIterable, Sendable {
    case morning
    case night
}

public struct HourSnapshot: Sendable, Hashable {
    public let date: Date
    public let slotIndex: Int
    public let outcome: String
    public let distractionsCount: Int
    public let topCause: DistractionCause
    public let result: HourResult
    public let finishedAt: Date?
    public let durationSeconds: Int
    public let elapsedSeconds: Int

    public init(
        date: Date,
        slotIndex: Int,
        outcome: String,
        distractionsCount: Int,
        topCause: DistractionCause,
        result: HourResult,
        finishedAt: Date? = nil,
        durationSeconds: Int = 3600,
        elapsedSeconds: Int = 3600
    ) {
        self.date = date
        self.slotIndex = slotIndex
        self.outcome = outcome
        self.distractionsCount = distractionsCount
        self.topCause = topCause
        self.result = result
        self.finishedAt = finishedAt
        self.durationSeconds = durationSeconds
        self.elapsedSeconds = elapsedSeconds
    }
}

public enum TierState: String, Sendable {
    case passed
    case current
    case locked
}

public struct CapacityTier: Sendable, Identifiable {
    public let hours: Int
    public let title: String
    public let subtitle: String
    public let state: TierState
    public let daysHitInLast7: Int
    public let daysNeeded: Int

    public var id: Int { hours }
}

public struct CapacitySummary: Sendable {
    public let currentHoursPerDay: Int
    public let daysHitInLast7: Int
    public let daysNeededToLevelUp: Int
    public let tiers: [CapacityTier]
}

public struct HeatmapCell: Sendable, Identifiable {
    public let date: Date
    public let hoursCount: Int
    public let isFuture: Bool

    public var id: Date { date }
}

public struct CauseStat: Sendable, Identifiable {
    public let cause: DistractionCause
    public let count: Int

    public var id: String { cause.rawValue }
}

public struct SlotStat: Sendable, Identifiable {
    public let slotIndex: Int
    public let averageDistractions: Double
    public let sessionCount: Int

    public var id: Int { slotIndex }
}

public enum FocusAnalytics {
    public static func formatCountdown(_ seconds: Int) -> String {
        let clamped = max(0, seconds)
        let mins = clamped / 60
        let secs = clamped % 60
        return String(format: "%02d:%02d", mins, secs)
    }

    public static func dayStart(_ date: Date, calendar: Calendar = .current) -> Date {
        calendar.startOfDay(for: date)
    }

    public static func completedCountsByDay(
        hours: [HourSnapshot],
        calendar: Calendar = .current
    ) -> [Date: Int] {
        var counts: [Date: Int] = [:]
        for hour in hours {
            let day = dayStart(hour.date, calendar: calendar)
            counts[day, default: 0] += 1
        }
        return counts
    }

    public static func capacitySummary(
        hours: [HourSnapshot],
        dailyGoal: Int,
        autoLevelUp: Bool,
        countWeekends: Bool,
        referenceDate: Date = .now,
        calendar: Calendar = .current
    ) -> CapacitySummary {
        let counts = completedCountsByDay(hours: hours, calendar: calendar)
        let today = dayStart(referenceDate, calendar: calendar)

        var last7DaysHit = 0
        for offset in 0..<7 {
            guard let day = calendar.date(byAdding: .day, value: -offset, to: today) else { continue }
            if !countWeekends && calendar.isDateInWeekend(day) { continue }
            if (counts[day] ?? 0) >= dailyGoal {
                last7DaysHit += 1
            }
        }

        let effectiveGoal = max(1, min(4, dailyGoal))
        let descriptors: [(Int, String, String)] = [
            (1, "Starting point", "One full 60-minute hour."),
            (2, "Build consistency", "Two hours, once one feels easy."),
            (3, "Increase capacity", "Three hours a day."),
            (4, "Target baseline", "Four focused hours, consistently."),
        ]

        let tiers = descriptors.map { (level, title, subtitle) -> CapacityTier in
            let state: TierState
            if level < effectiveGoal {
                state = .passed
            } else if level == effectiveGoal {
                state = .current
            } else {
                state = .locked
            }
            return CapacityTier(
                hours: level,
                title: title,
                subtitle: subtitle,
                state: state,
                daysHitInLast7: state == .current ? min(5, last7DaysHit) : (state == .passed ? 5 : 0),
                daysNeeded: 5
            )
        }

        return CapacitySummary(
            currentHoursPerDay: effectiveGoal,
            daysHitInLast7: min(5, last7DaysHit),
            daysNeededToLevelUp: max(0, 5 - last7DaysHit),
            tiers: tiers
        )
    }

    public static func weeklyHeatmap(
        hours: [HourSnapshot],
        weeks: Int = 12,
        referenceDate: Date = .now,
        calendar: Calendar = .current
    ) -> [[HeatmapCell]] {
        let counts = completedCountsByDay(hours: hours, calendar: calendar)
        let today = dayStart(referenceDate, calendar: calendar)
        // Weekday: 1 = Sun, 2 = Mon ... 7 = Sat -> convert to Mon=0..Sun=6
        let weekday = calendar.component(.weekday, from: today)
        let daysSinceMonday = (weekday + 5) % 7
        guard let currentWeekMonday = calendar.date(byAdding: .day, value: -daysSinceMonday, to: today),
              let startMonday = calendar.date(byAdding: .day, value: -(weeks - 1) * 7, to: currentWeekMonday)
        else { return [] }

        var grid: [[HeatmapCell]] = []
        for weekIndex in 0..<weeks {
            var column: [HeatmapCell] = []
            for dayOffset in 0..<7 {
                guard let date = calendar.date(byAdding: .day, value: weekIndex * 7 + dayOffset, to: startMonday) else { continue }
                let count = counts[date] ?? 0
                let isFuture = date > today
                column.append(HeatmapCell(date: date, hoursCount: count, isFuture: isFuture))
            }
            grid.append(column)
        }
        return grid
    }

    public static func causeBreakdown(
        hours: [HourSnapshot],
        days: Int = 30,
        referenceDate: Date = .now,
        calendar: Calendar = .current
    ) -> [CauseStat] {
        let cutoff = calendar.date(byAdding: .day, value: -days, to: dayStart(referenceDate, calendar: calendar)) ?? .distantPast
        var totals: [DistractionCause: Int] = [:]
        for hour in hours where hour.date >= cutoff && hour.distractionsCount > 0 {
            totals[hour.topCause, default: 0] += hour.distractionsCount
        }
        return totals
            .map { CauseStat(cause: $0.key, count: $0.value) }
            .sorted { lhs, rhs in
                if lhs.count != rhs.count { return lhs.count > rhs.count }
                return lhs.cause.title < rhs.cause.title
            }
    }

    public static func distractionsBySlot(
        hours: [HourSnapshot],
        maxSlots: Int = 4
    ) -> [SlotStat] {
        (1...maxSlots).map { slot in
            let matching = hours.filter { $0.slotIndex == slot }
            let avg: Double
            if matching.isEmpty {
                avg = 0
            } else {
                let total = matching.reduce(0) { $0 + $1.distractionsCount }
                avg = Double(total) / Double(matching.count)
            }
            return SlotStat(slotIndex: slot, averageDistractions: avg, sessionCount: matching.count)
        }
    }

    public static func streakDays(
        hours: [HourSnapshot],
        dailyGoal: Int,
        countWeekends: Bool,
        referenceDate: Date = .now,
        calendar: Calendar = .current
    ) -> Int {
        let counts = completedCountsByDay(hours: hours, calendar: calendar)
        var cursor = dayStart(referenceDate, calendar: calendar)
        // If today hasn't hit the goal yet, check starting from yesterday.
        if (counts[cursor] ?? 0) < dailyGoal {
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: cursor) else { return 0 }
            cursor = yesterday
        }

        var streak = 0
        for _ in 0..<365 {
            if !countWeekends && calendar.isDateInWeekend(cursor) {
                guard let prev = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
                cursor = prev
                continue
            }
            if (counts[cursor] ?? 0) >= max(1, dailyGoal) {
                streak += 1
                guard let prev = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
                cursor = prev
            } else {
                break
            }
        }
        return streak
    }

    public static func csvExport(hours: [HourSnapshot]) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"

        var lines = ["Date,Hour Slot,Outcome,Distractions,Top Cause,Finished,Result"]
        for hour in hours.sorted(by: { $0.date > $1.date }) {
            let dateStr = formatter.string(from: hour.date)
            let finishedStr = hour.finishedAt.map { timeFormatter.string(from: $0) } ?? ""
            let escapedOutcome = "\"\(hour.outcome.replacingOccurrences(of: "\"", with: "\"\""))\""
            lines.append("\(dateStr),\(hour.slotIndex),\(escapedOutcome),\(hour.distractionsCount),\(hour.topCause.title),\(finishedStr),\(hour.result.title)")
        }
        return lines.joined(separator: "\n")
    }
}
