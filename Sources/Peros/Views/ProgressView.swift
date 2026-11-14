import PerosKit
import SwiftUI

struct ProgressDashboardView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let summary = model.capacitySummary
        ScrollView {
            VStack(alignment: .leading, spacing: Space.lg) {
                VStack(alignment: .leading, spacing: Space.xs) {
                    Text("TRAIN FOCUS LIKE A SKILL")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Palette.accentText)
                        .tracking(0.8)

                    Text("You are at \(summary.currentHoursPerDay) \(summary.currentHoursPerDay == 1 ? "hour" : "hours") a day")
                        .font(.system(size: 32, weight: .bold))

                    Text("Hit your level on 5 of the last 7 days and Peros offers the next one. Miss three days in a row and it suggests stepping back.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: Space.md) {
                    ForEach(summary.tiers) { tier in
                        tierCard(tier)
                    }
                }

                HStack(alignment: .top, spacing: Space.lg) {
                    heatmapCard
                        .frame(maxWidth: .infinity)

                    standardsCard
                        .frame(width: 300)
                }
            }
            .padding(Space.xl)
            .gridArea("progress")
        }
        .navigationTitle("Progress")
    }

    private func tierCard(_ tier: CapacityTier) -> some View {
        let isCurrent = tier.state == .current
        let isPassed = tier.state == .passed

        return VStack(alignment: .leading, spacing: Space.sm) {
            HStack {
                Text("\(tier.hours)h")
                    .font(.title.weight(.bold))
                    .foregroundStyle(isCurrent ? Surfaces.nightCardInk : .primary)

                Spacer()

                Text(isPassed ? "Passed" : (isCurrent ? "\(tier.daysHitInLast7) of \(tier.daysNeeded) days" : "Locked"))
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(isPassed ? Surfaces.passedGreen : (isCurrent ? Palette.onAccent : .secondary))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        isPassed ? Surfaces.passedFill : (isCurrent ? Palette.accent : Surfaces.cardMuted),
                        in: Capsule()
                    )
            }

            Text(tier.title)
                .font(.headline)
                .foregroundStyle(isCurrent ? Surfaces.nightCardInk : .primary)

            Text(tier.subtitle)
                .font(.subheadline)
                .foregroundStyle(isCurrent ? Surfaces.nightCardMuted : .secondary)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: Space.xs)

            HStack(spacing: 4) {
                ForEach(1...7, id: \.self) { idx in
                    Capsule()
                        .fill(
                            isPassed ? Surfaces.passedGreen :
                            (isCurrent && idx <= tier.daysHitInLast7 ? Palette.accent : Surfaces.hairline)
                        )
                        .frame(height: 4)
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 152, alignment: .topLeading)
        .padding(Space.md)
        .background(isCurrent ? Surfaces.nightCard : Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.md)
                .stroke(isCurrent ? Color.clear : Surfaces.hairline, lineWidth: 1)
        )
    }

    private var heatmapCard: some View {
        let grid = FocusAnalytics.weeklyHeatmap(hours: model.allSnapshots, weeks: 12)
        let totalHours = model.data.hours.count
        let dayLabels = ["Mon", "", "Wed", "", "Fri", "", "Sun"]

        return VStack(alignment: .leading, spacing: Space.md) {
            HStack {
                Text("Last 12 weeks")
                    .font(.headline)
                Spacer()
                Text("\(totalHours) focused hours")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(alignment: .top, spacing: Space.sm) {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(0..<7, id: \.self) { row in
                        Text(dayLabels[row])
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .frame(height: 16)
                    }
                }

                HStack(spacing: 4) {
                    ForEach(Array(grid.enumerated()), id: \.offset) { _, week in
                        VStack(spacing: 4) {
                            ForEach(week) { cell in
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Surfaces.heatmapColor(level: cell.hoursCount, isFuture: cell.isFuture))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 4)
                                            .stroke(cell.isFuture ? Surfaces.hairline : Color.clear, lineWidth: 1)
                                    )
                                    .frame(width: 16, height: 16)
                            }
                        }
                    }
                }
            }

            HStack(spacing: 8) {
                Text("0h")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                ForEach(0...4, id: \.self) { level in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Surfaces.heatmapColor(level: level, isFuture: false))
                        .frame(width: 12, height: 12)
                }
                Text("4h")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(Space.lg)
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
    }

    private var standardsCard: some View {
        @Bindable var model = model
        return VStack(alignment: .leading, spacing: Space.md) {
            Text("Your standard")
                .font(.headline)

            Text("Four hours a day is one person's standard, not a rule. Pick what fits your work and your recovery.")
                .font(.caption)
                .foregroundStyle(.secondary)

            Picker("Daily goal", selection: $model.data.dailyGoal) {
                ForEach(1...4, id: \.self) { hrs in
                    Text("\(hrs) \(hrs == 1 ? "hour" : "hours")").tag(hrs)
                }
            }
            .onChange(of: model.data.dailyGoal) { _, _ in model.save() }

            Toggle("Count weekends", isOn: $model.data.countWeekends)
                .onChange(of: model.data.countWeekends) { _, _ in model.save() }

            Picker("Break length", selection: $model.data.breakMinutes) {
                Text("5 minutes").tag(5)
                Text("10 minutes").tag(10)
                Text("15 minutes").tag(15)
            }
            .onChange(of: model.data.breakMinutes) { _, _ in model.save() }

            Toggle("Raise the goal by itself", isOn: $model.data.autoLevelUp)
                .onChange(of: model.data.autoLevelUp) { _, _ in model.save() }
        }
        .padding(Space.lg)
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
    }
}
