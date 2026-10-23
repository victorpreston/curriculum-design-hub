import { useCallback, useState } from 'react';

export interface AsyncAction {
  busy: boolean;
  error: Error | null;
  run: <T>(action: () => Promise<T>) => Promise<T | undefined>;
}

export function useAsyncAction(): AsyncAction {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Request failed'));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, run };
}
