import { useCallback, useEffect, useRef, useState } from 'react';

export interface Resource<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
  replace: (data: T) => void;
}

export function useResource<T>(load: () => Promise<T>, key: string): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadRef
      .current()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught : new Error('Request failed'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { data, error, loading, reload, replace: setData };
}
