/**
 * Tests for UserAvatar — THI-220 defense-in-depth URL validation.
 *
 * Covers :
 *  - isValidAvatarUrl() pure function (host allow-list + HTTPS-only)
 *  - render branches : valid url → <img>, invalid url → fallback initials
 *  - all allowed hosts (GitHub + lh1-lh6) accepted
 *  - rejected schemes (http, javascript, data, file) → fallback
 *  - rejected hosts (uc.googleusercontent.com, evil.com) → fallback
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { UserAvatar, isValidAvatarUrl } from '../app/components/auth/UserAvatar';

// ── isValidAvatarUrl pure function ──────────────────────────────────────────

describe('isValidAvatarUrl — allow-list enforcement', () => {
  it.each([
    'https://avatars.githubusercontent.com/u/123456?v=4',
    'https://lh1.googleusercontent.com/a/ACg8oc',
    'https://lh2.googleusercontent.com/a/foo',
    'https://lh3.googleusercontent.com/a/bar',
    'https://lh4.googleusercontent.com/a/baz',
    'https://lh5.googleusercontent.com/a/qux',
    'https://lh6.googleusercontent.com/a/quux',
  ])('accepts allow-listed host: %s', (url) => {
    expect(isValidAvatarUrl(url)).toBe(true);
  });

  it.each([
    'http://avatars.githubusercontent.com/u/123', // not HTTPS
    'https://uc.googleusercontent.com/abc', // user-content host (Drive/Gmail)
    'https://lh7.googleusercontent.com/a/foo', // future host, not yet allow-listed
    'https://evil.com/a/foo',
    'https://avatars.githubusercontent.com.evil.com/a', // subdomain hijack attempt
    'https://avatars.githubusercontent.com.evil/a', // similar
    'javascript:alert(1)', // XSS attempt
    'data:image/png;base64,iVBORw0KGgo=', // data URL (CSP `data:` allowed but we reject here)
    'file:///etc/passwd', // local file scheme
    '', // empty string
    'not-a-url',
    '//avatars.githubusercontent.com/u/123', // protocol-relative
  ])('rejects unauthorized URL: %s', (url) => {
    expect(isValidAvatarUrl(url)).toBe(false);
  });
});

// ── UserAvatar render branches ──────────────────────────────────────────────

describe('UserAvatar — render branches', () => {
  it('renders <img> when avatarUrl is a valid GitHub avatar', () => {
    const { container } = render(
      <UserAvatar
        avatarUrl="https://avatars.githubusercontent.com/u/123?v=4"
        initials="T"
        size="md"
      />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://avatars.githubusercontent.com/u/123?v=4');
  });

  it('renders <img> when avatarUrl is a valid Google avatar (lh3)', () => {
    const { container } = render(
      <UserAvatar avatarUrl="https://lh3.googleusercontent.com/a/x" initials="T" size="sm" />
    );
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('falls back to initials when avatarUrl is undefined', () => {
    render(<UserAvatar initials="T" size="lg" />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('falls back to initials when avatarUrl uses an unauthorized host', () => {
    const { container } = render(
      <UserAvatar
        avatarUrl="https://uc.googleusercontent.com/danger"
        initials="X"
        size="md"
      />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('falls back to initials when avatarUrl uses http (not HTTPS)', () => {
    const { container } = render(
      <UserAvatar
        avatarUrl="http://avatars.githubusercontent.com/u/123"
        initials="H"
        size="md"
      />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('falls back to initials on javascript: scheme XSS attempt', () => {
    const { container } = render(
      <UserAvatar avatarUrl="javascript:alert(1)" initials="J" size="md" />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('J')).toBeInTheDocument();
  });
});
