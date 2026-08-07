/**
 * @jest-environment node
 */

import {
  resolveLocaleFromAcceptLanguage,
  getLocaleFromRequest,
} from "../../lib/locale"

describe("resolveLocaleFromAcceptLanguage", () => {
  it("returns es-ES for an exact es-ES match", () => {
    // Arrange & Act
    const locale = resolveLocaleFromAcceptLanguage("es-ES,es;q=0.9")

    // Assert
    expect(locale).toBe("es-ES")
  })

  it("maps the bare es language prefix to es-ES", () => {
    // Arrange & Act
    const locale = resolveLocaleFromAcceptLanguage("es")

    // Assert
    expect(locale).toBe("es-ES")
  })

  it("maps the bare en language prefix to en-GB", () => {
    // Arrange & Act
    const locale = resolveLocaleFromAcceptLanguage("en")

    // Assert
    expect(locale).toBe("en-GB")
  })

  it("returns en-GB for an exact en-GB match", () => {
    // Arrange & Act
    const locale = resolveLocaleFromAcceptLanguage("en-GB")

    // Assert
    expect(locale).toBe("en-GB")
  })

  it("falls back to the mapped es prefix when the first candidate es-MX is not active", () => {
    // Arrange & Act
    const locale = resolveLocaleFromAcceptLanguage("es-MX,es;q=0.9")

    // Assert
    expect(locale).toBe("es-ES")
  })

  it("returns the default locale for an unmapped inactive locale (fr-FR)", () => {
    // Arrange & Act
    const locale = resolveLocaleFromAcceptLanguage("fr-FR")

    // Assert
    expect(locale).toBe("en-GB")
  })

  it("returns the default locale for null input", () => {
    // Arrange & Act
    const locale = resolveLocaleFromAcceptLanguage(null)

    // Assert
    expect(locale).toBe("en-GB")
  })

  it("returns the default locale for an empty string", () => {
    // Arrange & Act
    const locale = resolveLocaleFromAcceptLanguage("")

    // Assert
    expect(locale).toBe("en-GB")
  })

  it("returns the default locale for a wildcard accept-language", () => {
    // Arrange & Act
    const locale = resolveLocaleFromAcceptLanguage("*")

    // Assert
    expect(locale).toBe("en-GB")
  })

  it("returns en-GB when en-US is not active but its en prefix is mapped", () => {
    // Arrange & Act
    const locale = resolveLocaleFromAcceptLanguage("en-US,en;q=0.9")

    // Assert
    expect(locale).toBe("en-GB")
  })
})

describe("getLocaleFromRequest", () => {
  it("resolves the locale from the accept-language header", () => {
    // Arrange
    const request = new Request("https://x.test", {
      headers: { "accept-language": "es-ES" },
    })

    // Act
    const locale = getLocaleFromRequest(request)

    // Assert
    expect(locale).toBe("es-ES")
  })

  it("returns the default locale when no accept-language header is present", () => {
    // Arrange
    const request = new Request("https://x.test")

    // Act
    const locale = getLocaleFromRequest(request)

    // Assert
    expect(locale).toBe("en-GB")
  })
})
