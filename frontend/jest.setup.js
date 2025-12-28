import '@testing-library/jest-dom'

// Create a fresh localStorage mock for each test
const createLocalStorageMock = () => {
  const store = {}

  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: jest.fn((key) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
  }
}

let localStorageMock

// Set up global localStorage mock
beforeEach(() => {
  localStorageMock = createLocalStorageMock()
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
})
