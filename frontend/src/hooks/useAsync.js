import { useState, useEffect } from 'react';

/**
 * Hook for managing async operations (API calls)
 * @param {Function} fn - Async function to call
 * @param {Array} deps - Dependencies array
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({
    status: 'idle', // idle, pending, success, error
    data: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const execute = async () => {
      setState({ status: 'pending', data: null, error: null });
      try {
        const result = await fn();
        if (mounted) {
          setState({ status: 'success', data: result, error: null });
        }
      } catch (error) {
        if (mounted) {
          setState({ status: 'error', data: null, error: error.message });
        }
      }
    };

    execute();

    return () => {
      mounted = false;
    };
  }, deps);

  return state;
}

export default useAsync;
