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
                Label(model.sidebarTitle(page), systemImage: page.symbol)
                    .font(.body)
                    .padding(.vertical, 4)
                    .tag(page)
            }

            Spacer(minLength: Space.sm)

            languageSwitch
                .padding(.horizontal, Space.sm)
                .padding(.bottom, Space.xs)

            levelCard
                .padding(.horizontal, Space.sm)
                .padding(.bottom, Space.md)
        }
        .navigationSplitViewColumnWidth(min: 224, ideal: 252)
    }

    private var languageSwitch: some View {
        @Bindable var model = model
        return Picker(model.t("Ngôn ngữ", "Language"), selection: $model.data.language) {
            ForEach(AppLanguage.allCases) { lang in
                Text(lang.displayName).tag(lang)
            }
        }
        .pickerStyle(.segmented)
        .labelsHidden()
        .onChange(of: model.data.language) { _, _ in model.save() }
    }

    private var levelCard: some View {
        let summary = model.capacitySummary
        return VStack(alignment: .leading, spacing: Space.xs) {
            Text(model.t("CẤP ĐỘ HIỆN TẠI", "CURRENT LEVEL"))
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .tracking(0.6)

            Text("\(summary.currentHoursPerDay) \(model.t("giờ / ngày", summary.currentHoursPerDay == 1 ? "hour / day" : "hours / day"))")
                .font(.title2.weight(.bold))

            Text(model.t(
                "Đạt \(summary.daysHitInLast7)/5 ngày tuần này · Còn \(summary.daysNeededToLevelUp) ngày để lên cấp.",
                "\(summary.daysHitInLast7) of 5 days hit this week · \(summary.daysNeededToLevelUp) more to level up."
            ))
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
        case .userGuide:
            UserGuideView()
        }
    }
}
