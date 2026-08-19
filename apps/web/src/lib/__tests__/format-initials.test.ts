import { getInitials } from "../format";

describe("[UX-09] getInitials Formatter", () => {
  it("extracts 2 initials from two-word names", () => {
    expect(getInitials("Budi Santoso")).toBe("BS");
    expect(getInitials("John Doe")).toBe("JD");
    expect(getInitials("Siti Aminah")).toBe("SA");
  });

  it("extracts 2 initials from names with 3 or more words", () => {
    expect(getInitials("Siti Aminah Putri")).toBe("SA");
    expect(getInitials("Muhammad Rizky Pratama")).toBe("MR");
  });

  it("extracts single initial for one-word names", () => {
    expect(getInitials("Budi")).toBe("B");
    expect(getInitials("sarah")).toBe("S");
  });

  it("handles prefixes, titles, and extra whitespace correctly", () => {
    expect(getInitials("  Dr.   Ahmad   Yani  ")).toBe("DA");
    expect(getInitials("H. Syarif")).toBe("HS");
  });

  it("supports custom maxInitials parameter", () => {
    expect(getInitials("Ahmad Fauzi Rahman", 3)).toBe("AFR");
    expect(getInitials("Ahmad Fauzi Rahman", 1)).toBe("A");
  });

  it("returns fallback '?' for empty, whitespace, null, or undefined values", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
    expect(getInitials(null)).toBe("?");
    expect(getInitials(undefined)).toBe("?");
  });
});
