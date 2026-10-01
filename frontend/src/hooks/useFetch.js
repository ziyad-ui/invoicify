import { useCallback, useEffect, useState } from "react";
import { parseApiError } from "../api/http.js";

/**
 * Tiny data-fetching hook giving every page consistent loading / error states.
 *   const { data, loading, error, reload, setData } = useFetch(() => clientsApi.list(), []);
 * Re-runs when anything in `deps` changes or when reload() is called.
 */
export default function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: parseApiError(err) });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback(
    (updater) =>
      setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater })),
    []
  );

  return { ...state, reload, setData };
}
