import AppKit
import Foundation
import Observation
import PerosKit
import UniformTypeIdentifiers

enum SidebarItem: String, CaseIterable, Identifiable {
    case today
    case stickyWall
    case workLog
    case progress
    case ritualsGoals
    case userGuide

    var id: String { rawValue }

    var title: String {
        switch self {
        case .today: "Today"
        case .stickyWall: "Sticky Wall"
        case .workLog: "Work Log"
        case .progress: "Progress"
        case .ritualsGoals: "Rituals & Goals"
        case .userGuide: "User Guide"
        }
    }

    var symbol: String {
        switch self {
        case .today: "clock"
        case .stickyWall: "square.grid.2x2"
        case .workLog: "list.bullet.rectangle"
        case .progress: "chart.bar"
        case .ritualsGoals: "sun.max"
        case .userGuide: "book.closed"
        }
    }
}

enum FocusStep: Int, CaseIterable, Identifiable {
    case chooseOutcome = 1
    case focus = 2
    case record = 3
    case restReview = 4

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .chooseOutcome: "1  Choose outcome"
        case .focus: "2  Focus 60 min"
        case .record: "3  Record"
        case .restReview: "4  Rest & review"
        }
    }
}

enum WallRange: String, CaseIterable, Identifiable {
    case week = "Week"
    case month = "Month"
    case allTime = "All time"

    var id: String { rawValue }
}

struct FocusHourRecord: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var date: Date
    var slotIndex: Int
    var outcome: String
    var reward: String
    var durationSeconds: Int = 3600
    var elapsedSeconds: Int = 3600
    var distractionsCount: Int = 0
    var topCause: DistractionCause = .phone
    var result: HourResult = .done
    var finishedAt: Date?

    var snapshot: HourSnapshot {
        HourSnapshot(
            date: date,
            slotIndex: slotIndex,
            outcome: outcome,
            distractionsCount: distractionsCount,
            topCause: topCause,
            result: result,
            finishedAt: finishedAt,
            durationSeconds: durationSeconds,
            elapsedSeconds: elapsedSeconds
        )
    }
}

struct ChecklistItem: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var title: String
    var minutes: Int = 0
    var isCompleted: Bool = false
}

struct CrewMember: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var name: String
    var initials: String
    var colorHex: UInt32
    var statusText: String
    var completedToday: Int
    var dailyGoal: Int
}

struct PerosStoreData: Codable {
    var language: AppLanguage = .vi
    var hours: [FocusHourRecord] = []
    var dailyGoal: Int = 1
    var sessionMinutes: Int = 60
    var countWeekends: Bool = true

    enum CodingKeys: String, CodingKey {
        case language, hours, dailyGoal, sessionMinutes, countWeekends, breakMinutes, autoLevelUp
        case preflightItems, blockedSites, morningChecklist, nightChecklist, fiveGoals
        case identityStatement, thoughtHabits, tomorrowFirstOutcome, hourRewards, crewMembers
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        language = try c.decodeIfPresent(AppLanguage.self, forKey: .language) ?? .vi
        hours = try c.decodeIfPresent([FocusHourRecord].self, forKey: .hours) ?? []
        dailyGoal = try c.decodeIfPresent(Int.self, forKey: .dailyGoal) ?? 1
        sessionMinutes = try c.decodeIfPresent(Int.self, forKey: .sessionMinutes) ?? 60
        countWeekends = try c.decodeIfPresent(Bool.self, forKey: .countWeekends) ?? true
        breakMinutes = try c.decodeIfPresent(Int.self, forKey: .breakMinutes) ?? 10
        autoLevelUp = try c.decodeIfPresent(Bool.self, forKey: .autoLevelUp) ?? false
        preflightItems = try c.decodeIfPresent([ChecklistItem].self, forKey: .preflightItems) ?? Self.defaultPreflight
        blockedSites = try c.decodeIfPresent([String].self, forKey: .blockedSites) ?? ["x.com", "youtube.com", "reddit.com", "news.ycombinator.com"]
        morningChecklist = try c.decodeIfPresent([ChecklistItem].self, forKey: .morningChecklist) ?? Self.defaultMorning
        nightChecklist = try c.decodeIfPresent([ChecklistItem].self, forKey: .nightChecklist) ?? Self.defaultNight
        fiveGoals = try c.decodeIfPresent([String].self, forKey: .fiveGoals) ?? Self.defaultFiveGoals
        identityStatement = try c.decodeIfPresent(String.self, forKey: .identityStatement) ?? "I am someone who does the hard hour first."
        thoughtHabits = try c.decodeIfPresent([String].self, forKey: .thoughtHabits) ?? ["\"Difficult\" means I am in the right place.", "Count it, then go back. No guilt."]
        tomorrowFirstOutcome = try c.decodeIfPresent(String.self, forKey: .tomorrowFirstOutcome) ?? "Record module 2, lessons 1–3"
        hourRewards = try c.decodeIfPresent([String].self, forKey: .hourRewards) ?? ["Beer on the balcony", "10-min walk", "One chapter of a novel", "Close the laptop for the day"]
        crewMembers = try c.decodeIfPresent([CrewMember].self, forKey: .crewMembers) ?? Self.defaultCrew
    }

    static let defaultFiveGoals: [String] = [
        "Ship the course by December 15",
        "Reach your monthly revenue goal",
        "Run a half-marathon in spring",
        "Read 24 books this year",
        "Publish one video every week",
    ]
    var breakMinutes: Int = 10
    var autoLevelUp: Bool = false
    var preflightItems: [ChecklistItem] = PerosStoreData.defaultPreflight
    var blockedSites: [String] = ["x.com", "youtube.com", "reddit.com", "news.ycombinator.com"]
    var morningChecklist: [ChecklistItem] = PerosStoreData.defaultMorning
    var nightChecklist: [ChecklistItem] = PerosStoreData.defaultNight
    var fiveGoals: [String] = [
        "Ship the course by December 15",
        "Reach your monthly revenue goal",
        "Run a half-marathon in spring",
        "Read 24 books this year",
        "Publish one video every week",
    ]
    var identityStatement: String = "I am someone who does the hard hour first."
    var thoughtHabits: [String] = [
        "\"Difficult\" means I am in the right place.",
        "Count it, then go back. No guilt.",
    ]
    var tomorrowFirstOutcome: String = "Record module 2, lessons 1–3"
    var hourRewards: [String] = [
        "Beer on the balcony",
        "10-min walk",
        "One chapter of a novel",
        "Close the laptop for the day",
    ]
    var crewMembers: [CrewMember] = PerosStoreData.defaultCrew

    static let defaultPreflight: [ChecklistItem] = [
        ChecklistItem(title: "Phone is in another room", isCompleted: true),
        ChecklistItem(title: "Blocklist on: X, YouTube, Reddit, news", isCompleted: true),
        ChecklistItem(title: "Water on the desk", isCompleted: false),
    ]

    static let defaultMorning: [ChecklistItem] = [
        ChecklistItem(title: "Walk outside", minutes: 10, isCompleted: true),
        ChecklistItem(title: "Big glass of water", minutes: 1, isCompleted: true),
        ChecklistItem(title: "Read the five goals out loud", minutes: 2, isCompleted: true),
        ChecklistItem(title: "Plan four outcomes for today", minutes: 4, isCompleted: false),
        ChecklistItem(title: "Stretch", minutes: 3, isCompleted: false),
        ChecklistItem(title: "Phone to another room, blocklist on", minutes: 2, isCompleted: false),
    ]

    static let defaultNight: [ChecklistItem] = [
        ChecklistItem(title: "Clear the desk, close every tab", isCompleted: false),
        ChecklistItem(title: "Review today: what pulled you away?", isCompleted: false),
        ChecklistItem(title: "Write tomorrow's first outcome", isCompleted: false),
        ChecklistItem(title: "Share today's wall with Focus Crew", isCompleted: false),
    ]

    static let defaultCrew: [CrewMember] = [
        CrewMember(name: "Tam", initials: "T", colorHex: 0xC85A32, statusText: "Hit 2 of 4, on hour 3", completedToday: 2, dailyGoal: 4),
        CrewMember(name: "Linh", initials: "L", colorHex: 0x2E7D4F, statusText: "Finished 4. Big reward: hike", completedToday: 4, dailyGoal: 4),
        CrewMember(name: "Marco", initials: "M", colorHex: 0x2563EB, statusText: "1 of 3 · ramping up", completedToday: 1, dailyGoal: 3),
        CrewMember(name: "Ana", initials: "A", colorHex: 0x7C3AED, statusText: "Not started yet", completedToday: 0, dailyGoal: 3),
    ]
}

@Observable
final class AppModel {
    let storeURL: URL
    var data: PerosStoreData
    var sidebar: SidebarItem? = .today
    var wallRange: WallRange = .week
    var workLogSearch: String = ""

    // Active focus session state
    var activeSlotIndex: Int = 1
    var currentStep: FocusStep = .chooseOutcome
    var draftOutcome: String = ""
    var draftReward: String = "Beer on the balcony"
    var focusDurationSeconds: Int = 3600
    var remainingSeconds: Int = 3600
    var isTimerPaused: Bool = false
    var activeDistractions: Int = 0
    var activeCauseCounts: [DistractionCause: Int] = [:]
    var breakRemainingSeconds: Int = 600
    var showFloatingHUD: Bool = false

    private var timerTask: Task<Void, Never>?

    var settingsTab: SettingsTab = SettingsTab(rawValue: UserDefaults.standard.string(forKey: "settings.tab") ?? "") ?? .general {
        didSet { if !Store.isOverridden { UserDefaults.standard.set(settingsTab.rawValue, forKey: "settings.tab") } }
    }

    init(storeURL: URL = Store.url) {
        self.storeURL = storeURL
        self.data = Store.load(from: storeURL)
        syncNextSlotDefaults()
    }

    // MARK: - Computed Summaries

    var todayHours: [FocusHourRecord] {
        let cal = Calendar.current
        return data.hours
            .filter { cal.isDateInToday($0.date) }
            .sorted { $0.slotIndex < $1.slotIndex }
    }

    var allSnapshots: [HourSnapshot] {
        data.hours.map(\.snapshot)
    }

    var capacitySummary: CapacitySummary {
        FocusAnalytics.capacitySummary(
            hours: allSnapshots,
            dailyGoal: data.dailyGoal,
            autoLevelUp: data.autoLevelUp,
            countWeekends: data.countWeekends
        )
    }

    var streakDays: Int {
        FocusAnalytics.streakDays(
            hours: allSnapshots,
            dailyGoal: data.dailyGoal,
            countWeekends: data.countWeekends
        )
    }

    var isFocusing: Bool {
        currentStep == .focus
    }

    var isResting: Bool {
        currentStep == .restReview
    }

    var menuBarLabel: String {
        if currentStep == .focus {
            return "\(FocusAnalytics.formatCountdown(remainingSeconds)) · \(activeSlotIndex)"
        }
        if currentStep == .restReview {
            return "Break \(FocusAnalytics.formatCountdown(breakRemainingSeconds))"
        }
        return "\(todayHours.count)/\(data.dailyGoal)"
    }

    func rewardForSlot(_ slot: Int) -> String {
        let index = max(0, min(data.hourRewards.count - 1, slot - 1))
        return data.hourRewards.isEmpty ? "Beer on the balcony" : data.hourRewards[index]
    }

    func syncNextSlotDefaults() {
        let completedSlots = Set(todayHours.map(\.slotIndex))
        let next = (1...max(data.dailyGoal, 4)).first { !completedSlots.contains($0) } ?? (todayHours.count + 1)
        activeSlotIndex = next
        draftReward = rewardForSlot(next)
    }

    var dailyGoalChoice: Int {
        get {
            (data.dailyGoal == 1 && data.sessionMinutes == 30) ? 30 : data.dailyGoal * 60
        }
        set {
            if newValue == 30 {
                data.dailyGoal = 1
                data.sessionMinutes = 30
            } else {
                data.dailyGoal = max(1, min(4, newValue / 60))
                data.sessionMinutes = 60
            }
            if currentStep == .chooseOutcome {
                focusDurationSeconds = data.sessionMinutes * 60
                remainingSeconds = focusDurationSeconds
            }
            save()
        }
    }

    // MARK: - Focus Lifecycle

    func startFocusHour(durationSeconds: Int? = nil) {
        let targetSeconds = durationSeconds ?? (data.sessionMinutes * 60)
        let cleaned = ItemTitle.clean(draftOutcome)
        draftOutcome = cleaned == "New Item" && draftOutcome.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? "Deep focus session"
            : cleaned
        focusDurationSeconds = targetSeconds
        remainingSeconds = targetSeconds
        activeDistractions = 0
        activeCauseCounts = [:]
        isTimerPaused = false
        currentStep = .focus
        showFloatingHUD = true
        startTimerLoop()
    }

    func togglePause() {
        isTimerPaused.toggle()
    }

    func recordDistraction(cause: DistractionCause = .phone) {
        activeDistractions += 1
        activeCauseCounts[cause, default: 0] += 1
    }

    func finishFocusEarly() {
        stopTimerLoop()
        currentStep = .record
    }

    func saveHourResult(_ result: HourResult) {
        let topCause = activeCauseCounts
            .max(by: { $0.value < $1.value })?.key ?? .phone
        let elapsed = max(60, focusDurationSeconds - remainingSeconds)
        let record = FocusHourRecord(
            date: Date.now,
            slotIndex: activeSlotIndex,
            outcome: draftOutcome.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Untitled hour" : draftOutcome,
            reward: draftReward,
            durationSeconds: focusDurationSeconds,
            elapsedSeconds: elapsed,
            distractionsCount: activeDistractions,
            topCause: topCause,
            result: result,
            finishedAt: Date.now
        )
        data.hours.append(record)
        save()

        breakRemainingSeconds = max(60, data.breakMinutes * 60)
        currentStep = .restReview
        isTimerPaused = false
        startTimerLoop()
    }

    func finishBreakAndAdvance() {
        stopTimerLoop()
        showFloatingHUD = false
        draftOutcome = ""
        currentStep = .chooseOutcome
        syncNextSlotDefaults()
    }

    func selectSlot(_ slot: Int) {
        guard currentStep == .chooseOutcome else { return }
        activeSlotIndex = slot
        draftReward = rewardForSlot(slot)
    }

    // MARK: - Checklists & Settings

    func togglePreflightItem(_ id: UUID) {
        guard let idx = data.preflightItems.firstIndex(where: { $0.id == id }) else { return }
        data.preflightItems[idx].isCompleted.toggle()
        save()
    }

    func toggleMorningItem(_ id: UUID) {
        guard let idx = data.morningChecklist.firstIndex(where: { $0.id == id }) else { return }
        data.morningChecklist[idx].isCompleted.toggle()
        save()
    }

    func toggleNightItem(_ id: UUID) {
        guard let idx = data.nightChecklist.firstIndex(where: { $0.id == id }) else { return }
        data.nightChecklist[idx].isCompleted.toggle()
        save()
    }

    func save() {
        Store.save(data, to: storeURL)
    }

    func exportWorkLogCSV() {
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.commaSeparatedText]
        panel.nameFieldStringValue = "peros-work-log.csv"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        let csv = FocusAnalytics.csvExport(hours: allSnapshots)
        try? csv.write(to: url, atomically: true, encoding: .utf8)
    }

    // MARK: - Timer

    private func startTimerLoop() {
        stopTimerLoop()
        timerTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled, let self else { break }
                if self.isTimerPaused { continue }
                if self.currentStep == .focus {
                    if self.remainingSeconds > 0 {
                        self.remainingSeconds -= 1
                    } else {
                        self.finishFocusEarly()
                    }
                } else if self.currentStep == .restReview {
                    if self.breakRemainingSeconds > 0 {
                        self.breakRemainingSeconds -= 1
                    } else {
                        self.finishBreakAndAdvance()
                    }
                }
            }
        }
    }

    private func stopTimerLoop() {
        timerTask?.cancel()
        timerTask = nil
    }
}
