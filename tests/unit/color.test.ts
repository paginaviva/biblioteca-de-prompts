/**
 * @jest-environment node
 */

// Pure function tests (subtask 11, Fase B): HEX → HSL conversion used by the
// accent color picker. No mocks needed — lib/color.ts has no dependencies.
import { hexToHsl, isValidHex, type HSL } from "../../lib/color"

// Asserts the three HSL components of a single conversion result with
// approximate precision (floating point rounding from /255 division).
function expectHslCloseTo(
  result: HSL | null,
  expected: { h: number; s: number; l: number }
) {
  expect(result).not.toBeNull()
  if (!result) return
  expect(result.h).toBeCloseTo(expected.h, 1)
  expect(result.s).toBeCloseTo(expected.s, 1)
  expect(result.l).toBeCloseTo(expected.l, 1)
}

describe("hexToHsl", () => {
  it("converts #7c3aed (default accent purple) to hue 262, s 83, l 58", () => {
    // Arrange & Act
    const result = hexToHsl("#7c3aed")

    // Assert
    expectHslCloseTo(result, { h: 262.1, s: 83.3, l: 57.8 })
  })

  it("converts #2563eb (blue preset) to hue 221, s 83, l 53", () => {
    // Arrange & Act
    const result = hexToHsl("#2563eb")

    // Assert
    expectHslCloseTo(result, { h: 221.2, s: 83.2, l: 53.3 })
  })

  it("converts #000000 (black) to h 0, s 0, l 0", () => {
    // Arrange & Act
    const result = hexToHsl("#000000")

    // Assert
    expect(result).toEqual({ h: 0, s: 0, l: 0 })
  })

  it("converts #ffffff (white) to h 0, s 0, l 100", () => {
    // Arrange & Act
    const result = hexToHsl("#ffffff")

    // Assert
    expect(result).toEqual({ h: 0, s: 0, l: 100 })
  })

  it("converts #808080 (grey) with saturation 0 (achromatic)", () => {
    // Arrange & Act
    const result = hexToHsl("#808080")

    // Assert
    expect(result).not.toBeNull()
    expect(result!.s).toBe(0)
    expect(result!.h).toBe(0)
  })

  it("accepts uppercase hex digits", () => {
    // Arrange & Act
    const result = hexToHsl("#7C3AED")

    // Assert
    expect(result).toEqual(hexToHsl("#7c3aed"))
  })

  it("accepts a hex value without the leading #", () => {
    // Arrange & Act
    const result = hexToHsl("7c3aed")

    // Assert
    expect(result).toEqual(hexToHsl("#7c3aed"))
  })

  it("returns null for a non-hex string", () => {
    // Arrange & Act
    const result = hexToHsl("zzz")

    // Assert
    expect(result).toBeNull()
  })

  it("returns null for a 3-digit shorthand hex", () => {
    // Arrange & Act
    const result = hexToHsl("#abc")

    // Assert
    expect(result).toBeNull()
  })

  it("returns null for a 5-digit hex", () => {
    // Arrange & Act
    const result = hexToHsl("#12345")

    // Assert
    expect(result).toBeNull()
  })

  it("returns null for an empty string", () => {
    // Arrange & Act
    const result = hexToHsl("")

    // Assert
    expect(result).toBeNull()
  })
})

describe("isValidHex", () => {
  it("returns true for a #rrggbb hex", () => {
    // Arrange & Act
    const valid = isValidHex("#7c3aed")

    // Assert
    expect(valid).toBe(true)
  })

  it("returns true for a rrggbb hex without #", () => {
    // Arrange & Act
    const valid = isValidHex("7c3aed")

    // Assert
    expect(valid).toBe(true)
  })

  it("returns false for a 3-digit shorthand hex", () => {
    // Arrange & Act
    const valid = isValidHex("#abc")

    // Assert
    expect(valid).toBe(false)
  })

  it("returns false for a named color", () => {
    // Arrange & Act
    const valid = isValidHex("red")

    // Assert
    expect(valid).toBe(false)
  })
})
