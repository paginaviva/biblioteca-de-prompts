// Pure color utilities. No side effects, no external dependencies — the
// unit tests (subtask 11) exercise these in isolation.

const HEX_COLOR_REGEX = /^#?([0-9a-fA-F]{6})$/

export interface HSL {
  h: number
  s: number
  l: number
}

// Validates the HEX format accepted by the UI (#rrggbb, optional leading #).
export function isValidHex(hex: string): boolean {
  return HEX_COLOR_REGEX.test(hex)
}

// Converts a HEX color (#7c3aed or 7c3aed) to HSL (h 0-360, s/l 0-100).
// Returns null for any invalid format so callers can fall back to the
// default accent instead of rendering a broken color.
export function hexToHsl(hex: string): HSL | null {
  const match = HEX_COLOR_REGEX.exec(hex)
  if (!match) return null

  // Parse the 6 hex digits into normalized r/g/b channels (0-1).
  const value = parseInt(match[1], 16)
  const r = ((value >> 16) & 0xff) / 255
  const g = ((value >> 8) & 0xff) / 255
  const b = (value & 0xff) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  // Achromatic colors (grayscale) have no hue/saturation by definition.
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6
        break
      case g:
        h = (b - r) / delta + 2
        break
      default:
        h = (r - g) / delta + 4
    }
    h *= 60
    if (h < 0) h += 360
  }

  return { h, s: s * 100, l: l * 100 }
}
