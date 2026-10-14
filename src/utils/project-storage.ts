import { AspectRatio, Clip } from '../types/editor';

const DB_NAME = 'GardenCut_DB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const PROJECT_KEY = 'active_session';

interface SerializedClip extends Omit<Clip, 'source'> {
  sourceType: 'blob' | 'url' | 'empty';
  blobData?: Blob;
  sourceUrl?: string;
}

interface StoredProject {
  aspectRatio: AspectRatio;
  clips: SerializedClip[];
  savedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves current project state (clips and aspect ratio) to IndexedDB.
 * Converts transient blob URLs to persistent binary Blobs so they survive browser reload.
 */
export async function saveProjectToStorage(
  clips: Clip[],
  aspectRatio: AspectRatio
): Promise<boolean> {
  try {
    const db = await openDatabase();

    const serializedClips: SerializedClip[] = await Promise.all(
      clips.map(async (clip) => {
        const { source, ...rest } = clip;

        if (source && source.startsWith('blob:')) {
          try {
            const res = await fetch(source);
            const blob = await res.blob();
            return {
              ...rest,
              sourceType: 'blob' as const,
              blobData: blob
            };
          } catch {
            return {
              ...rest,
              sourceType: 'url' as const,
              sourceUrl: source
            };
          }
        } else if (source && (source.startsWith('http') || source.startsWith('data:'))) {
          return {
            ...rest,
            sourceType: 'url' as const,
            sourceUrl: source
          };
        } else {
          return {
            ...rest,
            sourceType: 'empty' as const
          };
        }
      })
    );

    const projectData: StoredProject = {
      aspectRatio,
      clips: serializedClips,
      savedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putRequest = store.put(projectData, PROJECT_KEY);

      putRequest.onsuccess = () => resolve(true);
      putRequest.onerror = () => reject(putRequest.error);
    });
  } catch (err) {
    console.error('Failed to save project to IndexedDB:', err);
    return false;
  }
}

/**
 * Loads project state from IndexedDB and re-creates active Object URLs for media sources.
 */
export async function loadProjectFromStorage(): Promise<{
  clips: Clip[];
  aspectRatio: AspectRatio;
  savedAt: number;
} | null> {
  try {
    const db = await openDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(PROJECT_KEY);

      getRequest.onsuccess = () => {
        const data = getRequest.result as StoredProject | undefined;
        if (!data || !Array.isArray(data.clips) || data.clips.length === 0) {
          resolve(null);
          return;
        }

        const restoredClips: Clip[] = data.clips.map((sc) => {
          let source = '';
          if (sc.sourceType === 'blob' && sc.blobData) {
            source = URL.createObjectURL(sc.blobData);
          } else if (sc.sourceType === 'url' && sc.sourceUrl) {
            source = sc.sourceUrl;
          }

          const { sourceType: _st, blobData: _bd, sourceUrl: _su, ...clipProps } = sc;
          return {
            ...clipProps,
            source
          };
        });

        resolve({
          clips: restoredClips,
          aspectRatio: data.aspectRatio || '16:9',
          savedAt: data.savedAt
        });
      };

      getRequest.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clears saved project from IndexedDB
 */
export async function clearProjectStorage(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delRequest = store.delete(PROJECT_KEY);
      delRequest.onsuccess = () => resolve();
      delRequest.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}
