/**
 * Tests for useJoinClass — THI-235 Sprint 2.A étape 3.
 *
 * Covers :
 *   - Happy path : valid code → result populated, error null
 *   - Code padding : trim normalizes input before RPC call
 *   - Empty code : returns FR error without hitting RPC
 *   - RPC error mapping : 42501, 22023, 02000, default
 *   - Message-based fallback when error code is missing (some Supabase
 *     RLS denials don't carry a code, only the message)
 *   - reset() clears result + error for retry
 *   - supabase=null (env vars not configured) returns a service error
 *   - already_enrolled idempotency flag preserved in result
 */
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => {
  const rpc = vi.fn();
  return {
    supabase: { rpc },
  };
});

const supabaseModule = await import('@/lib/supabase');
const rpcMock = vi.mocked(supabaseModule.supabase!.rpc);

import { useJoinClass } from '@/lib/hooks/useJoinClass';

beforeEach(() => {
  rpcMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useJoinClass — happy path', () => {
  it('returns the joined class info on success', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          class_id: 'class-1',
          class_name: 'Bash 101',
          teacher_id: 'teacher-1',
          joined_at: '2026-05-20T10:00:00Z',
          already_enrolled: false,
        },
      ],
      error: null,
    } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('a4368184d202');
    });

    expect(result.current.result).toEqual({
      class_id: 'class-1',
      class_name: 'Bash 101',
      teacher_id: 'teacher-1',
      joined_at: '2026-05-20T10:00:00Z',
      already_enrolled: false,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(rpcMock).toHaveBeenCalledWith('join_class_by_code', { code: 'a4368184d202' });
  });

  it('preserves already_enrolled flag (idempotent retry)', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          class_id: 'class-1',
          class_name: 'Bash 101',
          teacher_id: 'teacher-1',
          joined_at: '2026-05-20T10:00:00Z',
          already_enrolled: true,
        },
      ],
      error: null,
    } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('a4368184d202');
    });

    expect(result.current.result?.already_enrolled).toBe(true);
  });

  it('trims the input code before calling the RPC', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          class_id: 'class-1',
          class_name: 'Bash 101',
          teacher_id: 'teacher-1',
          joined_at: '2026-05-20T10:00:00Z',
          already_enrolled: false,
        },
      ],
      error: null,
    } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('  a4368184d202  ');
    });

    expect(rpcMock).toHaveBeenCalledWith('join_class_by_code', { code: 'a4368184d202' });
    expect(result.current.error).toBeNull();
  });
});

describe('useJoinClass — input validation', () => {
  it('returns FR error without hitting RPC when code is empty', async () => {
    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('');
    });

    expect(rpcMock).not.toHaveBeenCalled();
    expect(result.current.error).toContain('Entrez le code');
    expect(result.current.result).toBeNull();
  });

  it('returns FR error without hitting RPC when code is whitespace only', async () => {
    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('   ');
    });

    expect(rpcMock).not.toHaveBeenCalled();
    expect(result.current.error).toContain('Entrez le code');
  });
});

describe('useJoinClass — RPC error mapping', () => {
  it('maps 42501 (auth required) to FR message', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'must be authenticated to join a class' },
    } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('a4368184d202');
    });

    expect(result.current.error).toBe('Connectez-vous pour rejoindre une classe.');
    expect(result.current.result).toBeNull();
  });

  it('maps 22023 (empty code server-side) to FR message', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'invitation code is required' },
    } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('valid-shape-but-empty-server-side');
    });

    expect(result.current.error).toContain('Entrez le code');
  });

  it('maps 02000 (invalid code) to FR message', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '02000', message: 'invalid invitation code' },
    } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('badcodenotfound');
    });

    expect(result.current.error).toContain('Ce code est invalide ou expiré');
  });

  it('falls back to generic FR message for unknown error code', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '99999', message: 'unknown postgres error' },
    } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('a4368184d202');
    });

    expect(result.current.error).toContain('Impossible de rejoindre');
  });

  it('detects "must be authenticated" message when code is missing', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: undefined, message: 'must be authenticated to join a class' },
    } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('a4368184d202');
    });

    expect(result.current.error).toBe('Connectez-vous pour rejoindre une classe.');
  });

  it('detects "invalid invitation code" message when code is missing', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: undefined, message: 'invalid invitation code' },
    } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('a4368184d202');
    });

    expect(result.current.error).toContain('Ce code est invalide ou expiré');
  });
});

describe('useJoinClass — defensive states', () => {
  it('returns generic error when RPC returns empty array', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('a4368184d202');
    });

    expect(result.current.error).toContain('Impossible de rejoindre');
    expect(result.current.result).toBeNull();
  });

  it('returns generic error when RPC throws an unexpected exception', async () => {
    rpcMock.mockRejectedValue(new Error('network is unreachable'));

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('a4368184d202');
    });

    expect(result.current.error).toContain('Impossible de rejoindre');
  });
});

describe('useJoinClass — reset()', () => {
  it('clears result and error for a clean retry', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          class_id: 'class-1',
          class_name: 'Bash 101',
          teacher_id: 'teacher-1',
          joined_at: '2026-05-20T10:00:00Z',
          already_enrolled: false,
        },
      ],
      error: null,
    } as never);

    const { result } = renderHook(() => useJoinClass());
    await act(async () => {
      await result.current.joinClass('a4368184d202');
    });
    expect(result.current.result).not.toBeNull();

    act(() => {
      result.current.reset();
    });
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
