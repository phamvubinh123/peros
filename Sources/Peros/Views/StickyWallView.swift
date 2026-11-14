import PerosKit
import SwiftUI

struct StickyWallView: View {
    @Environment(AppModel.self) private var model

    private var filteredHours: [FocusHourRecord] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: .now)
        switch model.wallRange {
        case .week:
            let weekday = cal.component(.weekday, from: today)
            let daysSinceMonday = (weekday + 5) % 7
            let monday = cal.date(byAdding: .day, value: -daysSinceMonday, to: today) ?? today
            return model.data.hours.filter { $0.date >= monday }
        case .month:
            let cutoff = cal.date(byAdding: .day, value: -30, to: today) ?? today
            return model.data.hours.filter { $0.date >= cutoff }
        case .allTime:
            return model.data.hours
        }
    }

    private var avgDistractions: String {
        guard !filteredHours.isEmpty else { return "0.0" }
        let total = filteredHours.reduce(0) { $0 + $1.distractionsCount }
        return String(format: "%.1f", Double(total) / Double(filteredHours.count))
    }

    private var outcomesHitCount: Int {
        filteredHours.filter { $0.result == .done }.count
    }

    var body: some View {
        @Bindable var model = model
        ScrollView {
            VStack(alignment: .leading, spacing: Space.lg) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: Space.xs) {
                        Text("\(filteredHours.count) notes on the wall\(model.wallRange == .week ? " this week" : "")")
                            .font(.system(size: 32, weight: .bold))
                        Text("Every note is one finished hour. Evidence beats intention.")
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    HStack(spacing: Space.lg) {
                        statBlock(title: "Streak", value: "\(model.streakDays) days")
                        statBlock(title: "Distractions / hour", value: avgDistractions)
                        statBlock(title: "Outcomes hit", value: "\(outcomesHitCount) of \(filteredHours.count)")
                    }
                }

                Picker("Range", selection: $model.wallRange) {
                    ForEach(WallRange.allCases) { range in
                        Text(range.rawValue).tag(range)
                    }
                }
                .pickerStyle(.segmented)
                .frame(width: 260)

                HStack(alignment: .top, spacing: Space.lg) {
                    wallGrid
                        .frame(maxWidth: .infinity)

                    crewCard
                        .frame(width: 256)
                }
            }
            .padding(Space.xl)
            .gridArea("stickyWall")
        }
        .navigationTitle("Sticky Wall")
    }

    private func statBlock(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title2.weight(.bold).monospacedDigit())
        }
    }

    private var wallGrid: some View {
        let cal = Calendar.current
        let today = cal.startOfDay(for: .now)
        let weekday = cal.component(.weekday, from: today)
        let daysSinceMonday = (weekday + 5) % 7
        let monday = cal.date(byAdding: .day, value: -daysSinceMonday, to: today) ?? today
        let weekDays: [Date] = (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: monday) }

        return HStack(alignment: .top, spacing: Space.xs) {
            ForEach(weekDays, id: \.self) { day in
                let dayHours = filteredHours
                    .filter { cal.isDate($0.date, inSameDayAs: day) }
                    .sorted { $0.slotIndex < $1.slotIndex }

                VStack(alignment: .leading, spacing: Space.xs) {
                    HStack {
                        Text(day.formatted(.dateTime.weekday(.abbreviated)))
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("\(dayHours.count)/\(model.data.dailyGoal)")
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }

                    if dayHours.isEmpty {
                        RoundedRectangle(cornerRadius: Radius.sm)
                            .strokeBorder(Surfaces.hairline, style: StrokeStyle(lineWidth: 1, dash: [4]))
                            .frame(height: 84)
                    } else {
                        ForEach(dayHours) { hour in
                            stickyNoteCard(hour)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(Space.md)
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
    }

    private func stickyNoteCard(_ hour: FocusHourRecord) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(hour.finishedAt?.formatted(date: .omitted, time: .shortened) ?? "Hour \(hour.slotIndex)")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)

            Text(hour.outcome)
                .font(.subheadline.weight(.semibold))
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 4)

            HStack {
                Text("\(hour.distractionsCount) distr.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                if hour.result == .partly {
                    Text("partly")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Surfaces.partlyAmber)
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 100, alignment: .topLeading)
        .padding(Space.xs)
        .background(Surfaces.stickyYellow, in: RoundedRectangle(cornerRadius: Radius.xs))
        .overlay(RoundedRectangle(cornerRadius: Radius.xs).stroke(Surfaces.stickyYellowBorder, lineWidth: 1))
    }

    private var crewCard: some View {
        VStack(alignment: .leading, spacing: Space.md) {
            HStack {
                Text("Focus Crew")
                    .font(.headline)
                Spacer()
                Text("today")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            ForEach(model.data.crewMembers) { member in
                HStack(spacing: Space.sm) {
                    Circle()
                        .fill(Color(hex: member.colorHex))
                        .frame(width: 28, height: 28)
                        .overlay(
                            Text(member.initials)
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.white)
                        )

                    VStack(alignment: .leading, spacing: 2) {
                        Text(member.name)
                            .font(.subheadline.weight(.semibold))
                        Text(member.statusText)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    HStack(spacing: 2) {
                        ForEach(1...max(1, member.dailyGoal), id: \.self) { idx in
                            RoundedRectangle(cornerRadius: 2)
                                .fill(idx <= member.completedToday ? Color(hex: member.colorHex) : Surfaces.hairline)
                                .frame(width: 8, height: 12)
                        }
                    }
                }
            }
        }
        .padding(Space.md)
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
    }
}
