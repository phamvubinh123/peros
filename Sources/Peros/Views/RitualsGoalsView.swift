import SwiftUI

struct RitualsGoalsView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        ScrollView {
            VStack(alignment: .leading, spacing: Space.lg) {
                VStack(alignment: .leading, spacing: Space.xs) {
                    Text("Set up the day. Close it down.")
                        .font(.system(size: 32, weight: .bold))
                    Text("Your environment and habits should push you toward the next focused hour.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                }

                HStack(alignment: .top, spacing: Space.md) {
                    morningCard
                    fiveGoalsCard
                    nightCard
                }

                rewardsStrip
            }
            .padding(Space.xl)
            .gridArea("ritualsGoals")
        }
        .navigationTitle("Rituals & Goals")
    }

    private var morningCard: some View {
        let doneCount = model.data.morningChecklist.filter(\.isCompleted).count
        return VStack(alignment: .leading, spacing: Space.md) {
            HStack {
                Text("Morning · 20 min")
                    .font(.headline)
                Spacer()
                Text("\(doneCount) of \(model.data.morningChecklist.count)")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: Space.sm) {
                ForEach(model.data.morningChecklist) { item in
                    Button {
                        model.toggleMorningItem(item.id)
                    } label: {
                        HStack {
                            Image(systemName: item.isCompleted ? "checkmark.square.fill" : "square")
                                .foregroundStyle(item.isCompleted ? Palette.accent : .secondary)
                            Text(item.title)
                                .font(.body)
                                .foregroundStyle(.primary)
                                .multilineTextAlignment(.leading)
                            Spacer()
                            if item.minutes > 0 {
                                Text("\(item.minutes)m")
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }

            Spacer(minLength: Space.sm)

            Button {
                model.sidebar = .today
            } label: {
                Text("Plan today's \(model.data.dailyGoal) outcomes")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .frame(maxWidth: .infinity, minHeight: 360, alignment: .topLeading)
        .padding(Space.lg)
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
    }

    private var fiveGoalsCard: some View {
        @Bindable var model = model
        return VStack(alignment: .leading, spacing: Space.md) {
            Text("Five goals")
                .font(.headline)

            VStack(alignment: .leading, spacing: Space.xs) {
                ForEach(model.data.fiveGoals.indices, id: \.self) { idx in
                    HStack(alignment: .firstTextBaseline, spacing: Space.xs) {
                        Text("\(idx + 1).")
                            .font(.body.monospacedDigit().weight(.semibold))
                            .foregroundStyle(.secondary)
                        TextField("Goal \(idx + 1)", text: $model.data.fiveGoals[idx])
                            .textFieldStyle(.plain)
                            .font(.body)
                            .onSubmit { model.save() }
                    }
                }
            }

            Divider()

            VStack(alignment: .leading, spacing: 4) {
                Text("Who I am becoming")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                TextField("Identity", text: $model.data.identityStatement, axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.subheadline.weight(.semibold))
                    .onSubmit { model.save() }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Thought habits")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                ForEach(model.data.thoughtHabits, id: \.self) { habit in
                    Text("• \(habit)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 360, alignment: .topLeading)
        .padding(Space.lg)
        .background(Surfaces.stickyYellow, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.stickyYellowBorder, lineWidth: 1))
    }

    private var nightCard: some View {
        @Bindable var model = model
        let doneToday = model.todayHours.count
        let hitToday = model.todayHours.filter { $0.result == .done }.count
        let avgDistr = doneToday > 0
            ? String(format: "%.1f", Double(model.todayHours.reduce(0) { $0 + $1.distractionsCount }) / Double(doneToday))
            : "0.0"

        return VStack(alignment: .leading, spacing: Space.md) {
            HStack {
                Text("Night · 4 min")
                    .font(.headline)
                    .foregroundStyle(Surfaces.nightCardInk)
                Spacer()
                Text("Evening review")
                    .font(.caption)
                    .foregroundStyle(Surfaces.nightCardMuted)
            }

            HStack(spacing: Space.lg) {
                nightStat(label: "Hours", value: "\(doneToday)/\(model.data.dailyGoal)")
                nightStat(label: "Distr./h", value: avgDistr)
                nightStat(label: "Hit", value: "\(hitToday)/\(max(1, doneToday))")
            }

            Divider().overlay(Color.white.opacity(0.12))

            VStack(alignment: .leading, spacing: Space.sm) {
                ForEach(model.data.nightChecklist) { item in
                    Button {
                        model.toggleNightItem(item.id)
                    } label: {
                        HStack {
                            Image(systemName: item.isCompleted ? "checkmark.square.fill" : "square")
                                .foregroundStyle(item.isCompleted ? Palette.accent : Surfaces.nightCardMuted)
                            Text(item.title)
                                .font(.body)
                                .foregroundStyle(Surfaces.nightCardInk)
                                .multilineTextAlignment(.leading)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }

            Spacer(minLength: Space.sm)

            VStack(alignment: .leading, spacing: Space.xs) {
                Text("Tomorrow's first outcome")
                    .font(.caption)
                    .foregroundStyle(Surfaces.nightCardMuted)
                TextField("First outcome", text: $model.data.tomorrowFirstOutcome)
                    .textFieldStyle(.plain)
                    .foregroundStyle(Surfaces.nightCardInk)
                    .padding(Space.xs)
                    .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: Radius.xs))
                    .onSubmit { model.save() }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 360, alignment: .topLeading)
        .padding(Space.lg)
        .background(Surfaces.nightCard, in: RoundedRectangle(cornerRadius: Radius.md))
    }

    private func nightStat(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(Surfaces.nightCardMuted)
            Text(value)
                .font(.title3.weight(.bold).monospacedDigit())
                .foregroundStyle(Surfaces.nightCardInk)
        }
    }

    private var rewardsStrip: some View {
        HStack(spacing: Space.sm) {
            ForEach(0..<min(3, model.data.hourRewards.count), id: \.self) { idx in
                HStack(spacing: Space.xs) {
                    Text("After hour \(idx + 1)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text("· \(model.data.hourRewards[idx])")
                        .font(.caption.weight(.medium))
                }
                .padding(.horizontal, Space.md)
                .padding(.vertical, Space.xs)
                .background(Surfaces.card, in: Capsule())
                .overlay(Capsule().stroke(Surfaces.hairline, lineWidth: 1))
            }
            Spacer()
        }
    }
}
