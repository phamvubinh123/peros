import SwiftUI

enum Radius {
    static let xs: CGFloat = 6
    static let sm: CGFloat = 8
    static let row: CGFloat = 10
    static let md: CGFloat = 12
    static let lg: CGFloat = 18
    static let xl: CGFloat = 26
}

enum Surfaces {
    static let canvas = Color(light: 0xFBF9F6, dark: 0x161514)
    static let card = Color(light: 0xFFFFFF, dark: 0x201E1D)
    static let cardMuted = Color(light: 0xF5F2ED, dark: 0x272422)
    static let hairline = Color(light: 0xE6E1D8, dark: 0x35312E)

    static let stickyYellow = Color(light: 0xFFF3B8, dark: 0x453B19)
    static let stickyYellowBorder = Color(light: 0xEFE096, dark: 0x625423)

    static let nightCard = Color(light: 0x191817, dark: 0x100F0E)
    static let nightCardInk = Color(hex: 0xF5F2ED)
    static let nightCardMuted = Color(hex: 0xA8A29E)

    static let passedGreen = Color(light: 0x2E7D4F, dark: 0x5EC284)
    static let passedFill = Color(light: 0xEAF6EE, dark: 0x1E3527)
    static let partlyAmber = Color(light: 0xB86E14, dark: 0xF0A84B)
    static let partlyFill = Color(light: 0xFEF3E2, dark: 0x3B2B17)

    static func heatmapColor(level: Int, isFuture: Bool) -> Color {
        if isFuture {
            return Color.clear
        }
        switch level {
        case 0: return Color(light: 0xEAE6DF, dark: 0x2A2725)
        case 1: return Color(light: 0xF3C2A8, dark: 0x5B301E)
        case 2: return Color(light: 0xE58E63, dark: 0x8A4326)
        case 3: return Color(light: 0xD16638, dark: 0xB8552E)
        default: return Color(light: 0x9C3D18, dark: 0xE57A50)
        }
    }
}
