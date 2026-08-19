/**
 * THI-340 — the age gate as wired into LoginModal.
 *
 * The rule these tests pin down: **every path that can create an account goes
 * through the screen, and no other path does.** `signInWithOAuth` transparently
 * creates an account for a first-time visitor, so the GitHub/Google buttons are
 * account-creation surfaces even in "Connexion" mode — whereas
 * `signInWithPassword` can only authenticate an account that already exists and
 * is therefore deliberately left ungated.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockSignUp = vi.fn().mockResolvedValue({ error: null });
const mockSignInWithPassword = vi.fn().mockResolvedValue({ error: null });
const mockSignInWithOAuth = vi.fn().mockResolvedValue({ error: null });

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  },
}));

import { LoginModal } from '../app/components/auth/LoginModal';
import { markAgeBlocked, markAgeVerified } from '../lib/auth/ageGate';

/** Comfortably above 13 and below 13, relative to any plausible test clock. */
const ADULT_DOB = '1990-05-20';
const CHILD_DOB = `${new Date().getFullYear() - 8}-05-20`;

function renderModal() {
  return render(
    <MemoryRouter>
      <LoginModal open={true} onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

/** Switch to the account-creation tab, which is where the gate stands. */
function goToSignup() {
  fireEvent.click(screen.getByRole('button', { name: /^créer un compte$/i }));
}

function answerGate(dob: string) {
  fireEvent.change(screen.getByLabelText(/date de naissance/i), { target: { value: dob } });
  fireEvent.click(screen.getByRole('button', { name: /^continuer$/i }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('signup path', () => {
  it('shows the age screen instead of the signup form', () => {
    renderModal();
    goToSignup();

    expect(screen.getByLabelText(/date de naissance/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
  });

  it('asks for a date without hinting at the threshold', () => {
    renderModal();
    goToSignup();

    // A "je confirme avoir 13 ans ou plus" control would teach which answer
    // unlocks the form — the screen must stay neutral.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/13 ans/i)).not.toBeInTheDocument();
  });

  it('reveals the form once the visitor is old enough', async () => {
    renderModal();
    goToSignup();
    answerGate(ADULT_DOB);

    await waitFor(() => expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument());
    expect(screen.queryByLabelText(/date de naissance/i)).not.toBeInTheDocument();
  });

  it('carries the declaration into signUp so the server can stamp it', async () => {
    renderModal();
    goToSignup();
    answerGate(ADULT_DOB);

    await waitFor(() => expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/mot de passe/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /créer le compte/i }));

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledOnce());
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { data: { age_confirmed: true } } }),
    );
  });

  it('refuses the account under 13 and never reaches the form', async () => {
    renderModal();
    goToSignup();
    answerGate(CHILD_DOB);

    await waitFor(() => expect(screen.getByRole('button', { name: /continuer sans compte/i })).toBeInTheDocument());
    expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('never turns an unusable date into a block or a pass', async () => {
    renderModal();
    goToSignup();
    // `required` + `max` mean the browser refuses to submit an empty or future
    // date, and the date input refuses an impossible day (30 February) outright
    // — so the handler's "ask again" branch is a defensive guard rather than a
    // reachable screen. What matters at this level is that none of these ever
    // opens the form or writes a verdict. The branch itself is covered
    // directly in ageGate.test.ts.
    for (const unusable of ['', `${new Date().getFullYear() + 3}-01-01`]) {
      answerGate(unusable);

      expect(screen.getByLabelText(/date de naissance/i)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
      expect(localStorage.getItem('tl.age.blocked_until')).toBeNull();
      expect(sessionStorage.getItem('tl.age.verified')).toBeNull();
    }
  });
});

describe('closing the modal', () => {
  it('does not let a close-and-reopen slip past the gate', () => {
    const view = render(
      <MemoryRouter>
        <LoginModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    goToSignup();
    expect(screen.getByLabelText(/date de naissance/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /fermer/i }));
    view.rerender(
      <MemoryRouter>
        <LoginModal open={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    view.rerender(
      <MemoryRouter>
        <LoginModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    // The modal is kept mounted between openings, so without resetting `mode`
    // on close it would reopen on the signup tab with the gate already
    // dismissed — i.e. the creation form, unguarded.
    expect(screen.queryByPlaceholderText(/email/i)).toBeInTheDocument();
    goToSignup();
    expect(screen.getByLabelText(/date de naissance/i)).toBeInTheDocument();
  });
});

describe('OAuth path — an account-creation surface even in login mode', () => {
  it('gates the GitHub button and does not redirect yet', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /continuer avec github/i }));

    expect(screen.getByLabelText(/date de naissance/i)).toBeInTheDocument();
    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
  });

  it('resumes the provider the visitor originally clicked', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /continuer avec google/i }));
    answerGate(ADULT_DOB);

    await waitFor(() => expect(mockSignInWithOAuth).toHaveBeenCalledOnce());
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    );
  });

  it('refuses OAuth under 13', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /continuer avec github/i }));
    answerGate(CHILD_DOB);

    await waitFor(() => expect(screen.getByRole('button', { name: /continuer sans compte/i })).toBeInTheDocument());
    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
  });

  it('skips the screen once this tab has answered', async () => {
    markAgeVerified();
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /continuer avec github/i }));

    await waitFor(() => expect(mockSignInWithOAuth).toHaveBeenCalledOnce());
    expect(screen.queryByLabelText(/date de naissance/i)).not.toBeInTheDocument();
  });

  it('still refuses a device blocked in an earlier tab', async () => {
    markAgeBlocked(`${new Date().getFullYear() + 5}-01-01`);
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /continuer avec github/i }));

    // Straight to the refusal — a blocked visitor does not get to answer again.
    await waitFor(() => expect(screen.getByRole('button', { name: /continuer sans compte/i })).toBeInTheDocument());
    expect(screen.queryByLabelText(/date de naissance/i)).not.toBeInTheDocument();
    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
  });
});

describe('email login — deliberately ungated', () => {
  it('signs in an existing account without asking for a date of birth', async () => {
    renderModal();

    expect(screen.queryByLabelText(/date de naissance/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/mot de passe/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /^se connecter$/i }));

    await waitFor(() => expect(mockSignInWithPassword).toHaveBeenCalledOnce());
  });

  it('stays available to an adult on a device blocked for someone else', () => {
    markAgeBlocked(`${new Date().getFullYear() + 5}-01-01`);
    renderModal();

    // The block gates account creation, not access to an existing account.
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });
});
