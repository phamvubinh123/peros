import PerosKit
import SwiftUI

struct TodayView: View {
    @Environment(AppModel.self) private var model

    private let quickExamples = [
        "Write three cold email variants for the spring campaign",
        "Record the 4-minute intro for module 2",
        "Fix the 5 failing checkout tests",
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.lg) {
                headerBar
                stepBar
                mainStage
                slotStrip
            }
            .padding(Space.xl)
            .gridArea("today")
        }
        .navigationTitle("Today")
    }

    private var headerBar: some View {
        let totalSlots = max(model.data.dailyGoal, 4)
        let doneCount = model.todayHours.count
        return HStack(alignment: .center) {
            Text("Today · \(Date.now.formatted(.dateTime.weekday(.wide).month(.abbreviated).day()))")
                .font(.headline.weight(.medium))
                .foregroundStyle(.secondary)

            Spacer()

            HStack(spacing: Space.sm) {
                Text("Focused hours")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)

                HStack(spacing: 4) {
                    ForEach(1...totalSlots, id: \.self) { idx in
                        Capsule()
                            .fill(idx <= doneCount ? Palette.accent : Surfaces.hairline)
                            .frame(width: 28, height: 8)
                    }
                }

                Text("\(doneCount) / \(totalSlots)")
                    .font(.subheadline.monospacedDigit().weight(.semibold))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var stepBar: some View {
        HStack(spacing: Space.sm) {
            ForEach(FocusStep.allCases) { step in
                let isActive = model.currentStep == step
                Text(step.title)
                    .font(.subheadline.weight(isActive ? .semibold : .medium))
                    .foregroundStyle(isActive ? Palette.onAccent : .secondary)
                    .padding(.horizontal, Space.md)
                    .padding(.vertical, 8)
                    .background(
                        isActive ? Palette.accent : Surfaces.card,
                        in: Capsule()
                    )
                    .overlay(
                        Capsule().stroke(isActive ? Color.clear : Surfaces.hairline, lineWidth: 1)
                    )
            }
            Spacer()
        }
    }

    @ViewBuilder
    private var mainStage: some View {
        switch model.currentStep {
        case .chooseOutcome:
            chooseOutcomeStage
        case .focus:
            focusStage
        case .record:
            recordStage
        case .restReview:
            restStage
        }
    }

    private var chooseOutcomeStage: some View {
        @Bindable var model = model
        return HStack(alignment: .top, spacing: Space.lg) {
            VStack(alignment: .leading, spacing: Space.md) {
                Text("HOUR \(model.activeSlotIndex) OF \(max(model.data.dailyGoal, 4))")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Palette.accentText)
                    .tracking(0.8)

                Text("What will exist at the end of this hour?")
                    .font(.title.weight(.bold))

                Text("One specific outcome. Not a topic. You should be able to say \"done\" or \"not done\" when the timer ends.")
                    .font(.body)
                    .foregroundStyle(.secondary)

                VStack(alignment: .leading, spacing: Space.xs) {
                    Text("Outcome")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.secondary)

                    TextField("Untitled hour", text: $model.draftOutcome)
                        .textFieldStyle(.plain)
                        .font(.title3)
                        .padding(Space.sm)
                        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.sm))
                        .overlay(
                            RoundedRectangle(cornerRadius: Radius.sm)
                                .stroke(Surfaces.hairline, lineWidth: 1)
                        )
                }

                VStack(alignment: .leading, spacing: Space.xs) {
                    Text("Name the thing you will have finished. A number helps.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    FlowExamples(examples: quickExamples) { example in
                        model.draftOutcome = example
                    }
                }

                HStack(spacing: Space.md) {
                    Button {
                        model.startFocusHour()
                    } label: {
                        Label("Start 60:00", systemImage: "play.fill")
                            .padding(.horizontal, Space.sm)
                            .padding(.vertical, 4)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)

                    Text("Starts focus timer & tracks distractions locally.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, Space.xs)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Space.lg)
            .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))

            VStack(alignment: .leading, spacing: Space.md) {
                Text("Before you start")
                    .font(.title3.weight(.semibold))

                VStack(alignment: .leading, spacing: Space.sm) {
                    ForEach(model.data.preflightItems) { item in
                        Button {
                            model.togglePreflightItem(item.id)
                        } label: {
                            HStack(alignment: .top, spacing: Space.xs) {
                                Image(systemName: item.isCompleted ? "checkmark.square.fill" : "square")
                                    .foregroundStyle(item.isCompleted ? Palette.accent : .secondary)
                                Text(item.title)
                                    .font(.body)
                                    .foregroundStyle(.primary)
                                    .multilineTextAlignment(.leading)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }

                Divider()

                VStack(alignment: .leading, spacing: Space.xs) {
                    Text("Reward after this hour")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.secondary)

                    TextField("Reward", text: $model.draftReward)
                        .font(.body)
                        .textFieldStyle(.roundedBorder)
                }
            }
            .frame(width: 312, alignment: .leading)
            .padding(Space.lg)
            .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
        }
    }

    private var focusStage: some View {
        let progress = model.focusDurationSeconds > 0
            ? Double(model.focusDurationSeconds - model.remainingSeconds) / Double(model.focusDurationSeconds)
            : 0

        return HStack(alignment: .top, spacing: Space.lg) {
            VStack(alignment: .leading, spacing: Space.md) {
                HStack {
                    Text("HOUR \(model.activeSlotIndex) OF \(max(model.data.dailyGoal, 4))")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Palette.accentText)
                    Spacer()
                    Text(model.isTimerPaused ? "Paused" : "Focusing")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Palette.accentText)
                }

                Text(model.draftOutcome)
                    .font(.title2.weight(.bold))

                HStack(spacing: Space.xl) {
                    ZStack {
                        Circle()
                            .stroke(Surfaces.hairline, lineWidth: 12)
                        Circle()
                            .trim(from: 0, to: progress)
                            .stroke(Palette.accent, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        VStack(spacing: 2) {
                            Text(FocusAnalytics.formatCountdown(model.remainingSeconds))
                                .font(.system(size: 36, weight: .bold, design: .monospaced))
                                .contentTransition(.numericText())
                            Text("remaining")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .frame(width: 156, height: 156)

                    VStack(alignment: .leading, spacing: Space.md) {
                        HStack(spacing: Space.sm) {
                            Button {
                                model.togglePause()
                            } label: {
                                Label(model.isTimerPaused ? "Resume" : "Pause", systemImage: model.isTimerPaused ? "play.fill" : "pause.fill")
                            }
                            .buttonStyle(.bordered)

                            Button {
                                model.finishFocusEarly()
                            } label: {
                                Label("Finish & Record", systemImage: "checkmark.circle")
                            }
                            .buttonStyle(.borderedProminent)
                        }

                        VStack(alignment: .leading, spacing: Space.xs) {
                            Text("Distractions this hour: \(model.activeDistractions)")
                                .font(.subheadline.weight(.semibold))
                            HStack(spacing: 4) {
                                ForEach(0..<min(model.activeDistractions, 12), id: \.self) { _ in
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(Palette.accent)
                                        .frame(width: 4, height: 16)
                                }
                            }
                            .frame(height: 20)
                        }

                        Text("Reward waiting: \(model.draftReward)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Space.lg)
            .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))

            VStack(alignment: .leading, spacing: Space.sm) {
                Text("Count a distraction")
                    .font(.headline)
                Text("Notice it, tap once, and return to the outcome.")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                ForEach(DistractionCause.allCases) { cause in
                    Button {
                        model.recordDistraction(cause: cause)
                    } label: {
                        HStack {
                            Text("+1 \(cause.title)")
                            Spacer()
                            let count = model.activeCauseCounts[cause] ?? 0
                            if count > 0 {
                                Text("\(count)")
                                    .font(.caption.monospacedDigit().weight(.semibold))
                                    .foregroundStyle(Palette.accentText)
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            }
            .frame(width: 260, alignment: .leading)
            .padding(Space.lg)
            .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
        }
    }

    private var recordStage: some View {
        VStack(alignment: .leading, spacing: Space.md) {
            Text("HOUR \(model.activeSlotIndex) COMPLETE")
                .font(.caption.weight(.bold))
                .foregroundStyle(Palette.accentText)

            Text("Did you finish: \"\(model.draftOutcome)\"?")
                .font(.title2.weight(.bold))

            Text("Distractions logged: \(model.activeDistractions). Evidence beats intention—record it honestly.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack(spacing: Space.md) {
                Button("Done") { model.saveHourResult(.done) }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                Button("Partly") { model.saveHourResult(.partly) }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                Button("Not done") { model.saveHourResult(.notDone) }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
            }
            .padding(.top, Space.xs)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Space.lg)
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
    }

    private var restStage: some View {
        VStack(alignment: .leading, spacing: Space.md) {
            Text("REST & REVIEW")
                .font(.caption.weight(.bold))
                .foregroundStyle(Surfaces.passedGreen)

            Text("Take \(model.data.breakMinutes) minutes. Enjoy: \(model.draftReward)")
                .font(.title2.weight(.bold))

            Text(FocusAnalytics.formatCountdown(model.breakRemainingSeconds))
                .font(.system(size: 40, weight: .bold, design: .monospaced))
                .contentTransition(.numericText())

            Button("Start Next Hour") {
                model.finishBreakAndAdvance()
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Space.lg)
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
    }

    private var slotStrip: some View {
        let totalSlots = max(model.data.dailyGoal, 4)
        let bySlot = Dictionary(uniqueKeysWithValues: model.todayHours.map { ($0.slotIndex, $0) })

        return HStack(spacing: Space.sm) {
            ForEach(1...totalSlots, id: \.self) { slot in
                if let done = bySlot[slot] {
                    VStack(alignment: .leading, spacing: Space.xs) {
                        Text("HOUR \(slot) · \(done.finishedAt?.formatted(date: .omitted, time: .shortened) ?? "Done")")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.secondary)
                        Text(done.outcome)
                            .font(.subheadline.weight(.medium))
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, minHeight: 88, alignment: .topLeading)
                    .padding(Space.sm)
                    .background(Surfaces.stickyYellow, in: RoundedRectangle(cornerRadius: Radius.sm))
                    .overlay(RoundedRectangle(cornerRadius: Radius.sm).stroke(Surfaces.stickyYellowBorder, lineWidth: 1))
                } else {
                    let isCurrent = slot == model.activeSlotIndex
                    Button {
                        model.selectSlot(slot)
                    } label: {
                        VStack(alignment: .leading, spacing: Space.xs) {
                            Text(isCurrent ? "HOUR \(slot) · NOW" : "HOUR \(slot)")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(isCurrent ? Palette.accentText : .secondary)
                            Text(isCurrent ? "Choosing outcome..." : "Not planned yet")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, minHeight: 88, alignment: .topLeading)
                        .padding(Space.sm)
                        .background(isCurrent ? Surfaces.card : Surfaces.cardMuted, in: RoundedRectangle(cornerRadius: Radius.sm))
                        .overlay(
                            RoundedRectangle(cornerRadius: Radius.sm)
                                .stroke(isCurrent ? Palette.accent : Surfaces.hairline, lineWidth: isCurrent ? 1.5 : 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

private struct FlowExamples: View {
    let examples: [String]
    let onSelect: (String) -> Void

    var body: some View {
        HStack(spacing: Space.xs) {
            Text("Try:")
                .font(.caption)
                .foregroundStyle(.secondary)
            ForEach(examples, id: \.self) { item in
                Button(item) {
                    onSelect(item)
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .lineLimit(1)
            }
        }
    }
}
