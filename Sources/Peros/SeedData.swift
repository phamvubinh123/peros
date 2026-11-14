import Foundation
import PerosKit

/// Sample data for snapshots: APP_SEED=1 with APP_STORE in /tmp fills an empty
/// store with realistic focus hours across the last several weeks.
@MainActor
enum SeedData {
    static func insertIfRequested(into model: AppModel) {
        guard ProcessInfo.processInfo.environment["APP_SEED"] == "1" else { return }
        guard Store.isOverridden else {
            print("APP_SEED ignored: APP_STORE must be a file in /tmp")
            return
        }
        guard model.data.hours.isEmpty else { return }

        let cal = Calendar.current
        let today = cal.startOfDay(for: .now)
        model.data.dailyGoal = 3

        let sampleOutcomes: [(Int, Int, String, Int, DistractionCause, HourResult)] = [
            // Today (2 done so far)
            (0, 1, "Write three cold email variants for the spring campaign", 3, .phone, .done),
            (0, 2, "Outline the onboarding video script, 7 sections", 1, .wanderingThought, .done),
            // Yesterday
            (-1, 1, "Prep the workshop slides", 1, .newTab, .done),
            (-1, 2, "Record 3 shorts", 2, .phone, .done),
            (-1, 3, "Write the case study", 1, .notification, .done),
            (-1, 4, "Fix 5 failing checkout tests", 2, .newTab, .done),
            // 2 days ago
            (-2, 1, "Sketch the app icon", 1, .wanderingThought, .done),
            (-2, 2, "Outline next video script", 3, .phone, .done),
            (-2, 3, "Clean the CRM: 40 leads", 2, .newTab, .partly),
            // 3 days ago
            (-3, 1, "Answer 12 support tickets", 4, .person, .done),
            (-3, 2, "Draft the newsletter", 0, .wanderingThought, .done),
            (-3, 3, "Read 30 pages of Deep Work", 0, .wanderingThought, .done),
            // 4 days ago
            (-4, 1, "Write the client proposal for Azure", 1, .phone, .done),
            (-4, 2, "Refactor the auth flow", 2, .newTab, .done),
            (-4, 3, "Draft 5 LinkedIn hooks", 2, .notification, .done),
            // 5 days ago
            (-5, 1, "Plan the Q1 content calendar", 1, .wanderingThought, .done),
            (-5, 2, "Build the invoice template", 3, .phone, .done),
            // Earlier weeks for heatmap
            (-8, 1, "Rewrite the landing hero, 3 options", 2, .phone, .done),
            (-8, 2, "Edit episode 14 audio", 1, .newTab, .done),
            (-9, 1, "Record module 1, lessons 1–4", 1, .wanderingThought, .done),
            (-10, 1, "Ship pricing page update", 2, .notification, .done),
            (-15, 1, "Draft Q4 roadmap", 1, .phone, .done),
            (-16, 1, "Review user interviews", 0, .wanderingThought, .done),
            (-22, 1, "Prototype focus timer", 1, .newTab, .done),
        ]

        var records: [FocusHourRecord] = []
        for item in sampleOutcomes {
            let day = cal.date(byAdding: .day, value: item.0, to: today) ?? today
            let finished = cal.date(byAdding: .hour, value: 8 + item.1, to: day)
            records.append(FocusHourRecord(
                date: day,
                slotIndex: item.1,
                outcome: item.2,
                reward: model.rewardForSlot(item.1),
                durationSeconds: 3600,
                elapsedSeconds: 3600,
                distractionsCount: item.3,
                topCause: item.4,
                result: item.5,
                finishedAt: finished
            ))
        }
        model.data.hours = records
        model.save()
        model.syncNextSlotDefaults()
    }
}
