// __tests__/config/jest.setup.js
import '@testing-library/jest-dom';
import 'whatwg-fetch';
import { TextEncoder, TextDecoder } from 'util';

// Configuración global de fetch
global.fetch = fetch;

// Configuración de codificadores de texto
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Configuración de mocks globales
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Limpiar todos los mocks después de cada prueba
afterEach(() => {
    jest.clearAllMocks();
});

// Configurar timeouts globales
jest.setTimeout(10000);

// Silenciar advertencias de consola específicas
const originalError = console.error;
console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
        return;
    }
    originalError.call(console, ...args);
};