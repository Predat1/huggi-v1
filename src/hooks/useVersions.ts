import { useState } from 'react';

export type Version = {
  id: string;
  label: string;
  created_at: string;
  file_count: number;
};

/**
 * Version history management — load, display, and restore project snapshots.
 */
export function useVersions(
  projectId: string | null,
  databaseEnabled: boolean,
  userId: string | undefined,
  onRestore: (files: { path: string; content: string }[]) => void,
  showToast: (message: string, type: 'success' | 'info') => void,
) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  const loadVersions = async () => {
    if (!projectId || !databaseEnabled) return;
    setIsLoadingVersions(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.versions)) setVersions(data.versions);
    } catch {
      // silent
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!projectId || !userId || isRestoringVersion) return;
    if (!window.confirm('Restaurer cette version ? Les fichiers actuels seront remplacés.')) return;

    setIsRestoringVersion(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/versions/${versionId}/restore`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        },
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.files)) {
        onRestore(data.files);
        showToast('Version restaurée ✓', 'success');
        loadVersions();
      } else {
        showToast(data.error || 'Restauration échouée', 'info');
      }
    } catch {
      showToast('Erreur serveur', 'info');
    } finally {
      setIsRestoringVersion(false);
    }
  };

  return {
    versions,
    isLoadingVersions,
    isRestoringVersion,
    loadVersions,
    restoreVersion,
  };
}
