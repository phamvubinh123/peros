import PerosKit
import SwiftUI

struct WorkLogView: View {
    @Environment(AppModel.self) private var model

    private var filteredHours: [FocusHourRecord] {
        let sorted = model.data.hours.sorted { $0.date > $1.date }
        let query = model.workLogSearch.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return sorted }
        return sorted.filter {
            $0.outcome.lowercased().contains(query) ||
            $0.topCause.title.lowercased().contains(query)
        }
    }

    var body: some View {
        @Bindable var model = model
        ScrollView {
            VStack(alignment: .leading, spacing: Space.lg) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: Space.xs) {
                        Text("Every hour, on the record")
                            .font(.system(size: 32, weight: .bold))
                        Text("Date, outcome, distractions, finish time. Saved on this Mac. No form to fill.")
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    HStack(spacing: Space.sm) {
                        TextField("Search outcomes", text: $model.workLogSearch)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 200)

                        Button("Export CSV") {
                            model.exportWorkLogCSV()
                        }
                        .buttonStyle(.bordered)
                    }
                }

                HStack(alignment: .top, spacing: Space.lg) {
                    logTable
                        .frame(maxWidth: .infinity)

                    analyticsColumn
                        .frame(width: 280)
                }
            }
            .padding(Space.xl)
            .gridArea("workLog")
        }
        .navigationTitle("Work Log")
    }

    private var logTable: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Date").frame(width: 68, alignment: .leading)
                Text("Outcome").frame(maxWidth: .infinity, alignment: .leading)
                Text("Distr.").frame(width: 44, alignment: .trailing)
                Text("Top cause").frame(width: 92, alignment: .leading)
                Text("Finished").frame(width: 72, alignment: .leading)
                Text("Result").frame(width: 72, alignment: .trailing)
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.secondary)
            .padding(.horizontal, Space.md)
            .padding(.vertical, Space.sm)

            Divider()

            if filteredHours.isEmpty {
                ContentUnavailableView("No Logged Hours", systemImage: "list.bullet.rectangle", description: Text("Finish a focus hour on Today to record it here."))
                    .padding(Space.xl)
            } else {
                ForEach(filteredHours) { hour in
                    HStack {
                        Text(hour.date.formatted(.dateTime.month(.abbreviated).day()))
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)
                            .frame(width: 72, alignment: .leading)

                        Text(hour.outcome)
                            .font(.body.weight(.medium))
                            .lineLimit(1)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        Text("\(hour.distractionsCount)")
                            .font(.body.monospacedDigit())
                            .frame(width: 48, alignment: .trailing)

                        Text(hour.topCause.shortTitle)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .frame(width: 100, alignment: .leading)

                        Text(hour.finishedAt?.formatted(date: .omitted, time: .shortened) ?? "—")
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)
                            .frame(width: 76, alignment: .leading)

                        resultBadge(hour.result)
                            .frame(width: 72, alignment: .trailing)
                    }
                    .padding(.horizontal, Space.md)
                    .padding(.vertical, Space.xs)

                    Divider()
                }
            }
        }
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
    }

    private func resultBadge(_ result: HourResult) -> some View {
        let fg: Color
        let bg: Color
        switch result {
        case .done:
            fg = Surfaces.passedGreen
            bg = Surfaces.passedFill
        case .partly:
            fg = Surfaces.partlyAmber
            bg = Surfaces.partlyFill
        case .notDone:
            fg = .secondary
            bg = Surfaces.cardMuted
        }
        return Text(result.title)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(fg)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(bg, in: Capsule())
    }

    private var analyticsColumn: some View {
        let causes = FocusAnalytics.causeBreakdown(hours: model.allSnapshots, days: 30)
        let totalDistractions = causes.reduce(0) { $0 + $1.count }
        let maxCause = max(1, causes.first?.count ?? 1)
        let slots = FocusAnalytics.distractionsBySlot(hours: model.allSnapshots, maxSlots: 4)
        let maxSlotAvg = max(1.0, slots.map(\.averageDistractions).max() ?? 1.0)

        return VStack(spacing: Space.md) {
            VStack(alignment: .leading, spacing: Space.sm) {
                HStack {
                    Text("What pulls you away")
                        .font(.headline)
                    Spacer()
                    Text("\(totalDistractions)")
                        .font(.caption.monospacedDigit().weight(.semibold))
                        .foregroundStyle(.secondary)
                }

                if causes.isEmpty {
                    Text("No distractions logged yet.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(causes) { stat in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(stat.cause.title)
                                    .font(.caption)
                                Spacer()
                                Text("\(stat.count)")
                                    .font(.caption.monospacedDigit().weight(.semibold))
                            }
                            GeometryReader { geo in
                                Capsule()
                                    .fill(Palette.accent)
                                    .frame(width: geo.size.width * CGFloat(stat.count) / CGFloat(maxCause), height: 8)
                            }
                            .frame(height: 8)
                        }
                    }
                }
            }
            .padding(Space.md)
            .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))

            VStack(alignment: .leading, spacing: Space.sm) {
                Text("Distractions per hour slot")
                    .font(.headline)

                HStack(alignment: .bottom, spacing: Space.sm) {
                    ForEach(slots) { slot in
                        VStack(spacing: 4) {
                            Text(String(format: "%.1f", slot.averageDistractions))
                                .font(.caption2.monospacedDigit())
                                .foregroundStyle(.secondary)

                            RoundedRectangle(cornerRadius: 4)
                                .fill(Palette.accent.opacity(0.8))
                                .frame(height: max(8, 64 * CGFloat(slot.averageDistractions / maxSlotAvg)))

                            Text("Hour \(slot.slotIndex)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .frame(height: 112, alignment: .bottom)
            }
            .padding(Space.md)
            .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
        }
    }
}
