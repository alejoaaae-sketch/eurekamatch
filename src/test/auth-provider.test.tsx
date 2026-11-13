import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import SessionTracker from '@/components/SessionTracker';

const mocks = vi.hoisted(() => ({ unsubscribe: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: {
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: mocks.unsubscribe } } })),
    getSession: vi.fn(async () => ({ data: { session: null } })),
  } },
}));

afterEach(cleanup);
function Consumer() {
  const { loading, user } = useAuth();
  return <p>{loading ? 'loading' : user ? 'signed in' : 'signed out'}</p>;
}

describe('auth context shared with session tracking', () => {
  it('provides the session through SessionTracker without throwing', async () => {
    const { unmount } = render(<AuthProvider><SessionTracker><Consumer /></SessionTracker></AuthProvider>);
    await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument());
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalled();
  });
  it('continues sharing the same context after rerendering the provider', async () => {
    const { rerender } = render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument());
    rerender(<AuthProvider><SessionTracker><Consumer /></SessionTracker></AuthProvider>);
    expect(screen.getByText('signed out')).toBeInTheDocument();
  });
});