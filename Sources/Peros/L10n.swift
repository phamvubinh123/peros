import Foundation
import PerosKit

enum AppLanguage: String, CaseIterable, Identifiable, Codable {
    case vi
    case en

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .vi: "Tiếng Việt"
        case .en: "English"
        }
    }

    var shortLabel: String {
        switch self {
        case .vi: "VI"
        case .en: "EN"
        }
    }
}

extension AppModel {
    func t(_ vi: String, _ en: String) -> String {
        data.language == .vi ? vi : en
    }

    func sidebarTitle(_ item: SidebarItem) -> String {
        switch item {
        case .today: t("Hôm nay", "Today")
        case .stickyWall: t("Bảng ghi chú", "Sticky Wall")
        case .workLog: t("Nhật ký giờ làm", "Work Log")
        case .progress: t("Tiến độ", "Progress")
        case .ritualsGoals: t("Nghi thức & Mục tiêu", "Rituals & Goals")
        case .userGuide: t("Hướng dẫn", "User Guide")
        }
    }

    func stepTitle(_ step: FocusStep) -> String {
        switch step {
        case .chooseOutcome: t("1  Chọn mục tiêu", "1  Choose outcome")
        case .focus: t("2  Tập trung 60 phút", "2  Focus 60 min")
        case .record: t("3  Ghi nhận", "3  Record")
        case .restReview: t("4  Nghỉ & tổng kết", "4  Rest & review")
        }
    }

    func wallRangeTitle(_ range: WallRange) -> String {
        switch range {
        case .week: t("Tuần này", "Week")
        case .month: t("Tháng này", "Month")
        case .allTime: t("Tất cả", "All time")
        }
    }

    func resultTitle(_ result: HourResult) -> String {
        switch result {
        case .done: t("Xong", "Done")
        case .partly: t("Một phần", "Partly")
        case .notDone: t("Chưa xong", "Not done")
        }
    }

    func causeTitle(_ cause: DistractionCause) -> String {
        switch cause {
        case .phone: t("Điện thoại", "Phone")
        case .newTab: t("Mở tab mới", "New tab")
        case .wanderingThought: t("Suy nghĩ lan man", "Wandering thought")
        case .notification: t("Thông báo", "Notification")
        case .person: t("Có người bắt chuyện", "Someone talked to me")
        case .other: t("Khác", "Other")
        }
    }

    func causeShortTitle(_ cause: DistractionCause) -> String {
        switch cause {
        case .phone: t("Điện thoại", "Phone")
        case .newTab: t("Tab mới", "New tab")
        case .wanderingThought: t("Lan man", "Thought")
        case .notification: t("Thông báo", "Notification")
        case .person: t("Người khác", "Person")
        case .other: t("Khác", "Other")
        }
    }

    func tierTitle(_ hours: Int) -> String {
        switch hours {
        case 1: t("Điểm xuất phát", "Starting point")
        case 2: t("Xây sự đều đặn", "Build consistency")
        case 3: t("Tăng sức bền", "Increase capacity")
        default: t("Mốc mục tiêu", "Target baseline")
        }
    }

    func tierSubtitle(_ hours: Int) -> String {
        switch hours {
        case 1: t("Một giờ 60 phút trọn vẹn.", "One full 60-minute hour.")
        case 2: t("Hai giờ mỗi ngày khi 1 giờ đã nhẹ nhàng.", "Two hours, once one feels easy.")
        case 3: t("Ba giờ tập trung sâu mỗi ngày.", "Three hours a day.")
        default: t("Bốn giờ tập trung đều đặn mỗi ngày.", "Four focused hours, consistently.")
        }
    }
}
