import SwiftUI

/// The Settings window (Command-Comma). One tab per topic, at most about
/// six. Each tab is a grouped Form that sizes to its content, so the
/// window grows to fit and shows no scroll bar it does not need.
struct SettingsView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.settingsTab) {
            ForEach(SettingsTab.allCases) { tab in
                page(tab)
                    .tabItem { Label(tab.title, systemImage: tab.symbol) }
                    .tag(tab)
            }
        }
        .noInitialFocus()
    }

    @ViewBuilder
    private func page(_ tab: SettingsTab) -> some View {
        Form {
            switch tab {
            case .general: GeneralSettings()
            case .appearance: AppearanceSettings()
            }
        }
        .formStyle(.grouped)
        .fitsContent()
        .frame(width: 520)
    }
}

/// The Settings tabs. Snapshot mode walks through every case.
enum SettingsTab: String, CaseIterable, Identifiable {
    case general, appearance

    var id: String { rawValue }

    var title: String {
        switch self {
        case .general: "General"
        case .appearance: "Appearance"
        }
    }

    var symbol: String {
        switch self {
        case .general: "gearshape"
        case .appearance: "paintpalette"
        }
    }
}

struct GeneralSettings: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        Section(model.t("Ngôn ngữ & Chung", "Language & General")) {
            Picker(model.t("Ngôn ngữ", "Language"), selection: $model.data.language) {
                ForEach(AppLanguage.allCases) { lang in
                    Text(lang.displayName).tag(lang)
                }
            }
            .onChange(of: model.data.language) { _, _ in model.save() }

            Picker(model.t("Mục tiêu mỗi ngày", "Daily goal"), selection: $model.data.dailyGoal) {
                ForEach(1...4, id: \.self) { hrs in
                    Text("\(hrs) \(model.t("giờ", hrs == 1 ? "hour" : "hours"))").tag(hrs)
                }
            }
            .onChange(of: model.data.dailyGoal) { _, _ in model.save() }

            Toggle(model.t("Tính cả cuối tuần", "Count weekends"), isOn: $model.data.countWeekends)
                .onChange(of: model.data.countWeekends) { _, _ in model.save() }
        }
    }
}
