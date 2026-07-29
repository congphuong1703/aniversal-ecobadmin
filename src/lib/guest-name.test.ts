import { describe, expect, it } from "vitest";

import { maskGuestName, normalizeGuestName } from "./guest-name";

describe("guest names", () => {
  it("normalizes case and whitespace without removing Vietnamese marks", () => {
    expect(normalizeGuestName("  NGUYỄN   Văn An ")).toBe("nguyễn văn an");
    expect(normalizeGuestName("Nguyen Van An")).not.toBe(
      normalizeGuestName("Nguyễn Văn An"),
    );
  });

  it("keeps the first word and masks the rest", () => {
    expect(maskGuestName("Nguyễn Văn An")).toBe("Nguyễn V** A*");
  });
});
