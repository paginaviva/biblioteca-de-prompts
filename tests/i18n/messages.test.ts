import messagesEnGB from "../../messages/en-GB.json"
import messagesEsES from "../../messages/es-ES.json"

type MessageTree = {
  [key: string]: string | MessageTree
}

// Returns the full dotted path of every leaf (string value) in the tree,
// e.g. "Api.promptNotFound". Nested objects are walked recursively.
function collectLeafKeys(tree: MessageTree, prefix = ""): string[] {
  return Object.keys(tree).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key
    const value = tree[key]

    if (typeof value === "string") {
      return [path]
    }

    return collectLeafKeys(value, path)
  })
}

// Returns the dotted paths of all values that are empty or blank strings.
function findEmptyValues(tree: MessageTree, prefix = ""): string[] {
  return Object.keys(tree).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key
    const value = tree[key]

    if (typeof value === "string") {
      return value.trim() === "" ? [path] : []
    }

    return findEmptyValues(value, path)
  })
}

describe("i18n message catalog parity", () => {
  it("has exactly the same message key tree in en-GB and es-ES", () => {
    // Arrange
    const enGBKeys = collectLeafKeys(messagesEnGB as MessageTree).sort()
    const esESKeys = collectLeafKeys(messagesEsES as MessageTree).sort()

    // Act
    const onlyInEnGB = enGBKeys.filter((key) => !esESKeys.includes(key))
    const onlyInEsES = esESKeys.filter((key) => !enGBKeys.includes(key))

    // Assert
    const diffs = [
      onlyInEnGB.length > 0 ? `only in en-GB: [${onlyInEnGB.join(", ")}]` : "",
      onlyInEsES.length > 0 ? `only in es-ES: [${onlyInEsES.join(", ")}]` : "",
    ].filter(Boolean)

    expect(diffs).toEqual([])
  })

  it("has no empty or blank values in en-GB", () => {
    // Arrange & Act
    const emptyKeys = findEmptyValues(messagesEnGB as MessageTree)

    // Assert
    expect(emptyKeys).toEqual([])
  })

  it("has no empty or blank values in es-ES", () => {
    // Arrange & Act
    const emptyKeys = findEmptyValues(messagesEsES as MessageTree)

    // Assert
    expect(emptyKeys).toEqual([])
  })

  it("has at least 200 message keys in en-GB", () => {
    // Arrange & Act
    const keyCount = collectLeafKeys(messagesEnGB as MessageTree).length

    // Assert
    expect(keyCount).toBeGreaterThanOrEqual(200)
  })
})
