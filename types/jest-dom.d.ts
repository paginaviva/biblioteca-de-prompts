// Extends Jest's expect with the jest-dom matchers (toBeInTheDocument,
// toHaveClass, etc.). jest.setup.js imports the runtime, but that file is not
// part of the tsconfig include; this declaration makes the types visible to
// tsc for all test files.
import "@testing-library/jest-dom"
