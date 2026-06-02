// __tests__/__mocks__/providers/google-provider.ts
// Mocks for Google OAuth provider (Supabase Auth — no next-auth)

interface GoogleProfile {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  email: string;
  email_verified: boolean;
  picture: string;
}

export const MOCK_GOOGLE_ID = 'mock-google-id';
export const MOCK_GOOGLE_SECRET = 'mock-google-secret';

export const mockGoogleProfile: GoogleProfile = {
  sub: '123456789',
  name: 'Test User',
  given_name: 'Test',
  family_name: 'User',
  email: 'test@example.com',
  email_verified: true,
  picture: 'https://example.com/picture.jpg',
};

export const mockGoogleProvider = {
  id: 'google',
  name: 'Google',
  type: 'oauth',
};

export const mockSession = {
  user: {
    id: mockGoogleProfile.sub,
    email: mockGoogleProfile.email,
  },
};

export default mockGoogleProvider;
