import SwiftUI

struct UserGuideView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.lg) {
                VStack(alignment: .leading, spacing: Space.xs) {
                    Text(model.t("HƯỚNG DẪN SỬ DỤNG PEROS", "PEROS USER GUIDE"))
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Palette.accentText)
                        .tracking(0.8)

                    Text(model.t("Rèn luyện sự tập trung như một kỹ năng", "Train focus like a skill"))
                        .font(.system(size: 32, weight: .bold))

                    Text(model.t(
                        "Peros giúp bạn làm việc sâu theo từng block 60 phút có đầu ra rõ ràng, ghi nhận nguyên nhân xao nhãng mà không tự trách bản thân, và tăng dần sức bền từ 1 giờ lên 4 giờ mỗi ngày.",
                        "Peros helps you work deeply in 60-minute blocks with concrete outcomes, count distractions without guilt, and build capacity from 1 hour to 4 hours a day."
                    ))
                    .font(.body)
                    .foregroundStyle(.secondary)
                }

                HStack(alignment: .top, spacing: Space.md) {
                    guideCard(
                        number: "01",
                        title: model.t("Quy trình 4 bước mỗi giờ", "The 4-step hourly loop"),
                        bullets: [
                            model.t("1. Chọn mục tiêu (Choose outcome): Viết 1 kết quả cụ thể có thể đánh giá Xong / Chưa xong sau 60 phút.", "1. Choose outcome: Write one concrete deliverable you can mark Done or Not done after 60 minutes."),
                            model.t("2. Tập trung 60 phút: Bấm Start 60:00. Mỗi lần bị xao nhãng, bấm +1 để ghi nhận nguyên nhân rồi quay lại làm tiếp.", "2. Focus 60 min: Press Start 60:00. Whenever pulled away, log +1 distraction cause and return immediately."),
                            model.t("3. Ghi nhận (Record): Chọn Xong, Một phần hoặc Chưa xong. Kết quả được dán lên Sticky Wall & Work Log.", "3. Record: Mark Done, Partly, or Not done. Your hour is saved to Sticky Wall & Work Log."),
                            model.t("4. Nghỉ & thưởng: Nghỉ 10 phút và tự thưởng món bạn đã chọn trước khi vào giờ tiếp theo.", "4. Rest & review: Take your break, enjoy your reward, then step into the next hour."),
                        ]
                    )

                    guideCard(
                        number: "02",
                        title: model.t("Theo dõi & Nâng cấp sức bền", "Tracking & Capacity Ramp"),
                        bullets: [
                            model.t("Sticky Wall: Nhìn lại toàn bộ các giờ đã hoàn thành trong tuần/tháng dưới dạng giấy ghi chú vàng.", "Sticky Wall: Review every finished hour across the week or month as visual evidence."),
                            model.t("Work Log: Tìm kiếm lịch sử, xuất file CSV và xem biểu đồ 'What pulls you away' để loại bỏ nguồn gây nhiễu lớn nhất.", "Work Log: Search history, export CSV, and inspect distraction causes and slot patterns."),
                            model.t("Progress (1h → 4h): Đạt mục tiêu 5 trong 7 ngày gần nhất để mở khóa mức giờ cao hơn.", "Progress (1h → 4h): Hit your daily goal on 5 of the last 7 days to level up safely."),
                            model.t("Rituals & Goals: Khởi động 20 phút buổi sáng, giữ 5 mục tiêu lớn trước mắt, và tổng kết 4 phút buổi tối.", "Rituals & Goals: Anchor your day with a 20-min morning setup, Five Goals, and a 4-min night review."),
                        ]
                    )
                }

                HStack(alignment: .top, spacing: Space.md) {
                    shortcutCard
                    tipsCard
                }
            }
            .padding(Space.xl)
            .gridArea("userGuide")
        }
        .navigationTitle(model.t("Hướng dẫn", "User Guide"))
    }

    private func guideCard(number: String, title: String, bullets: [String]) -> some View {
        VStack(alignment: .leading, spacing: Space.md) {
            HStack(spacing: Space.xs) {
                Text(number)
                    .font(.caption.monospacedDigit().weight(.bold))
                    .foregroundStyle(Palette.onAccent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Palette.accent, in: Capsule())

                Text(title)
                    .font(.title3.weight(.bold))
            }

            VStack(alignment: .leading, spacing: Space.sm) {
                ForEach(bullets, id: \.self) { line in
                    HStack(alignment: .top, spacing: Space.xs) {
                        Text("•")
                            .font(.body.weight(.bold))
                            .foregroundStyle(Palette.accentText)
                        Text(line)
                            .font(.body)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .padding(Space.lg)
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
    }

    private var shortcutCard: some View {
        VStack(alignment: .leading, spacing: Space.md) {
            Text(model.t("Phím tắt & Menu Bar", "Shortcuts & Menu Bar"))
                .font(.title3.weight(.bold))

            shortcutRow("⌘ N", model.t("Bắt đầu ngay 1 giờ tập trung trên màn hình Hôm nay", "Start a new focus hour on Today"))
            shortcutRow("⌘ D", model.t("Ghi nhận nhanh +1 lần xao nhãng khi đang đếm giờ", "Log +1 distraction during an active hour"))
            shortcutRow("⌘ ,", model.t("Mở Cài đặt (đổi Tiếng Việt / English, màu nhấn)", "Open Settings (Language & Accent color)"))
            shortcutRow("Menu Bar", model.t("Theo dõi đồng hồ đếm ngược và bấm +1 xao nhãng mọi lúc", "View live countdown and log distractions from any app"))
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .padding(Space.lg)
        .background(Surfaces.card, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.hairline, lineWidth: 1))
    }

    private var tipsCard: some View {
        VStack(alignment: .leading, spacing: Space.md) {
            Text(model.t("Nguyên tắc cốt lõi", "Core Principles"))
                .font(.title3.weight(.bold))

            Text(model.t(
                "• Đừng viết chung chung kiểu \"Làm dự án\" — hãy viết \"Viết xong 3 email\" hoặc \"Sửa 5 test bị lỗi\".",
                "• Avoid vague topics like \"Work on project\" — write \"Draft 3 emails\" or \"Fix 5 failing tests\"."
            ))
            .font(.body)

            Text(model.t(
                "• Dữ liệu lưu 100% trên máy Mac của bạn tại ~/Library/Application Support/Peros/peros.json.",
                "• All data stays 100% local on your Mac at ~/Library/Application Support/Peros/peros.json."
            ))
            .font(.body)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .padding(Space.lg)
        .background(Surfaces.stickyYellow, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Surfaces.stickyYellowBorder, lineWidth: 1))
    }

    private func shortcutRow(_ key: String, _ desc: String) -> some View {
        HStack(alignment: .center, spacing: Space.sm) {
            Text(key)
                .font(.caption.monospaced().weight(.bold))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Surfaces.cardMuted, in: RoundedRectangle(cornerRadius: Radius.xs))
                .overlay(RoundedRectangle(cornerRadius: Radius.xs).stroke(Surfaces.hairline, lineWidth: 1))
                .frame(width: 84, alignment: .center)

            Text(desc)
                .font(.body)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
