import { useState, useCallback } from 'react';

/**
 * Standardized hook to wrap API calls with loading and error states.
 * 
 * @param {Function} apiFunc The API function to execute
 */
export function useApi(apiFunc) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc(...args);
      setData(result);
      return result;
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || "Une erreur inattendue est survenue";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  return { data, error, loading, request };
}
