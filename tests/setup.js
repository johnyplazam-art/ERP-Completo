// tests/setup.js
import { createPinia, setActivePinia } from 'pinia'

// Mock de localStorage para el entorno de Node/JSDOM
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString() },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Set up Pinia for tests
const pinia = createPinia()
setActivePinia(pinia)
