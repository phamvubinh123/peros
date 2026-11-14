import SwiftUI

struct ContentView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openSettings) private var openSettings

    var body: some View {
        NavigationSplitView {
            sidebar
        } detail: {
            detailView
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Surfaces.canvas)
        }
        .task {
            SeedData.insertIfRequested(into: model)
            SelfTest.runIfRequested(model: model)
            Snapshot.runIfRequested(model: model, openSettings: openSettings)
        }
    }

    private var sidebar: some View {
        @Bindable var model = model
        return VStack(spacing: 0) {
            List(SidebarItem.allCases, selection: $model.sidebar) { page in
                Label(page.title, systemImage: page.symbol)
                    .font(.body)
                    .padding(.vertical, 4)
                    .tag(page)
            }

            Spacer(minLength: Space.sm)

            levelCard
                .padding(.horizontal, Space.sm)
                .padding(.bottom, Space.md)
        }
        .navigationSplitViewColumnWidth(min: 220, ideal: 248)
    }

    private var levelCard: some View {
        let summary = model.capacitySummary
        return VStack(alignment: .leading, spacing: Space.xs) {
            Text("CURRENT LEVEL")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .tracking(0.6)

            Text("\(summary.currentHoursPerDay) \(summary.currentHoursPerDay == 1 ? "hour" : "hours") / day")
                .font(.title2.weight(.bold))

            Text("\(summary.daysHitInLast7) of 5 days hit this week · \(summary.daysNeededToLevelUp) more to level up.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Space.sm)
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.md)
                .stroke(Surfaces.hairline, lineWidth: 1)
        )
    }

    @ViewBuilder
    private var detailView: some View {
        switch model.sidebar ?? .today {
        case .today:
            TodayView()
        case .stickyWall:
            StickyWallView()
        case .workLog:
            WorkLogView()
        case .progress:
            ProgressDashboardView()
        case .ritualsGoals:
            RitualsGoalsView()
        }
    }
}
