import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';

describe('usePersistentState', () => {
  it('falls back to the initial value when storage is empty', () => {
    const { result } = renderHook(() => usePersistentState('k1', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('hydrates from a previously stored value', () => {
    localStorage.setItem('k2', JSON.stringify('stored'));
    const { result } = renderHook(() => usePersistentState('k2', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('persists updates back to storage', () => {
    const { result } = renderHook(() => usePersistentState('k3', { count: 0 }));
    act(() => result.current[1]({ count: 5 }));
    expect(result.current[0]).toEqual({ count: 5 });
    expect(JSON.parse(localStorage.getItem('k3')!)).toEqual({ count: 5 });
  });

  it('falls back to the initial value when stored JSON is corrupt', () => {
    localStorage.setItem('k4', '{not valid json');
    const { result } = renderHook(() => usePersistentState('k4', 'safe'));
    expect(result.current[0]).toBe('safe');
  });
});
