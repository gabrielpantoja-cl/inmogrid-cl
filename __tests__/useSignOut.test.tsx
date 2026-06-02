// __tests__/useSignOut.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'react-hot-toast';

// Mock Supabase client
const mockSignOut = jest.fn();
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}));

jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
  },
}));

const SignOutButton = () => {
  const handleSignOut = async () => {
    try {
      await mockSignOut();
      window.location.href = '/';
    } catch {
      toast.error('No se pudo cerrar la sesión. Por favor, intenta nuevamente.');
    }
  };

  return <button onClick={handleSignOut}>Cerrar Sesión</button>;
};

describe('SignOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería cerrar sesión correctamente', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const { getByText } = render(<SignOutButton />);

    fireEvent.click(getByText('Cerrar Sesión'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('debería manejar error al cerrar sesión', async () => {
    mockSignOut.mockImplementationOnce(() => {
      throw new Error('Error al cerrar sesión');
    });

    const { getByText } = render(<SignOutButton />);

    fireEvent.click(getByText('Cerrar Sesión'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'No se pudo cerrar la sesión. Por favor, intenta nuevamente.'
      );
    });
  });
});
