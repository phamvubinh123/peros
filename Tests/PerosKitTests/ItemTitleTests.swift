import XCTest
@testable import PerosKit

final class ItemTitleTests: XCTestCase {
    func testCleansTitles() {
        XCTAssertEqual(ItemTitle.clean("  Buy   milk "), "Buy milk")
        XCTAssertEqual(ItemTitle.clean("Call Mom"), "Call Mom")
        XCTAssertEqual(ItemTitle.clean("   "), "New Item")
    }
}
