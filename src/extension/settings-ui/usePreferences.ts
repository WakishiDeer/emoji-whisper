/**
 * React hook: usePreferences
 *
 * Loads and saves UserPreferences via StorageAdapter.
 * Shared between OptionsApp and PopupApp.
 */

import { useCallback, useEffect, useState } from "react";
import { UserPreferences } from "../../core/domain/preferences/user-preferences";
import { StorageAdapter } from "../adapters/storage-adapter";

type UsePreferencesReturn = {
  prefs: UserPreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;
  update: (next: UserPreferences) => Promise<void>;
  reload: () => Promise<void>;
};

const adapter = new StorageAdapter();

export function usePreferences(): UsePreferencesReturn {
  const [prefs, setPrefs] = useState<UserPreferences>(
    UserPreferences.createDefault(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await adapter.load();
      setPrefs(loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (next: UserPreferences) => {
    setSaving(true);
    setError(null);
    try {
      await adapter.save(next);
      setPrefs(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { prefs, loading, saving, error, update, reload: load };
}
