import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import HomePage from '@/app/page';
import { TEST_IDS, ROUTES } from '../../../__helpers__/constants';

// Constantes para tests
const TEST_VALUES = {
  BUTTON_TEXT: 'Iniciar sesión',
  LOADING_TEXT: 'Cargando...',
  CALLBACK_URL: ROUTES.DASHBOARD,
  ERROR_TEXT: /error/i,
  TERMS_TEXT: /he leído y acepto los términos/i,
  NETWORK_ERROR: 'Error de conexión',
  AUTH_ERROR: 'Error de autenticación',
};

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated'
  }))
}));

describe('Página de Login', () => {
  const mockRouter = {
    push: jest.fn(),
    prefetch: jest.fn(),
    replace: jest.fn()
  };

  beforeEach(() => {
    useRouter.mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    jest.resetAllMocks();
  });

  describe('Renderizado inicial', () => {
    it('debe mostrar elementos principales correctamente', () => {
      render(<HomePage />);
      
      expect(screen.getByRole('heading', { name: /bienvenido/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: TEST_VALUES.BUTTON_TEXT })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: TEST_VALUES.TERMS_TEXT })).toBeInTheDocument();
    });

    it('debe tener el botón deshabilitado inicialmente', () => {
      render(<HomePage />);
      
      const loginButton = screen.getByRole('button', { name: TEST_VALUES.BUTTON_TEXT });
      expect(loginButton).toBeDisabled();
    });
  });

  describe('Interacciones del usuario', () => {
    it('debe habilitar el botón cuando se aceptan los términos', () => {
      render(<HomePage />);
      
      const termsCheckbox = screen.getByRole('checkbox', { name: TEST_VALUES.TERMS_TEXT });
      const loginButton = screen.getByRole('button', { name: TEST_VALUES.BUTTON_TEXT });
      
      fireEvent.click(termsCheckbox);
      expect(loginButton).toBeEnabled();
    });

    it('debe mostrar spinner durante la autenticación', async () => {
      signIn.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<HomePage />);
      
      const termsCheckbox = screen.getByRole('checkbox', { name: TEST_VALUES.TERMS_TEXT });
      const loginButton = screen.getByRole('button', { name: TEST_VALUES.BUTTON_TEXT });
      
      fireEvent.click(termsCheckbox);
      fireEvent.click(loginButton);
      
      expect(screen.getByTestId(TEST_IDS.LOADING_SPINNER)).toBeInTheDocument();
    });
  });

  describe('Flujos de autenticación', () => {
    it('debe manejar autenticación exitosa', async () => {
      signIn.mockResolvedValueOnce({ ok: true, error: null });
      render(<HomePage />);
      
      const termsCheckbox = screen.getByRole('checkbox', { name: TEST_VALUES.TERMS_TEXT });
      const loginButton = screen.getByRole('button', { name: TEST_VALUES.BUTTON_TEXT });
      
      fireEvent.click(termsCheckbox);
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('google', {
          callbackUrl: TEST_VALUES.CALLBACK_URL,
          redirect: false
        });
        expect(mockRouter.push).toHaveBeenCalledWith(TEST_VALUES.CALLBACK_URL);
      });
    });

    it('debe manejar errores de autenticación', async () => {
      const errorMessage = 'Error de autenticación';
      signIn.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<HomePage />);
      
      const termsCheckbox = screen.getByRole('checkbox', { name: TEST_VALUES.TERMS_TEXT });
      const loginButton = screen.getByRole('button', { name: TEST_VALUES.BUTTON_TEXT });
      
      fireEvent.click(termsCheckbox);
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
        expect(loginButton).toBeEnabled();
      });
    });

    it('debe manejar errores de red', async () => {
      signIn.mockRejectedValueOnce(new Error(TEST_VALUES.NETWORK_ERROR));
      
      render(<HomePage />);
      
      const termsCheckbox = screen.getByRole('checkbox', { name: TEST_VALUES.TERMS_TEXT });
      const loginButton = screen.getByRole('button', { name: TEST_VALUES.BUTTON_TEXT });
      
      fireEvent.click(termsCheckbox);
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(TEST_VALUES.NETWORK_ERROR)).toBeInTheDocument();
        expect(loginButton).toBeEnabled();
      });
    });
  });

  describe('Limpieza y recuperación', () => {
    it('debe limpiar errores al reintentar login', async () => {
      signIn.mockRejectedValueOnce(new Error(TEST_VALUES.AUTH_ERROR));
      
      render(<HomePage />);
      
      const termsCheckbox = screen.getByRole('checkbox', { name: TEST_VALUES.TERMS_TEXT });
      const loginButton = screen.getByRole('button', { name: TEST_VALUES.BUTTON_TEXT });
      
      fireEvent.click(termsCheckbox);
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(TEST_VALUES.AUTH_ERROR)).toBeInTheDocument();
      });
      
      fireEvent.click(loginButton);
      
      expect(screen.queryByText(TEST_VALUES.AUTH_ERROR)).not.toBeInTheDocument();
    });
  });
});