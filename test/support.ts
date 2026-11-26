import type { TrackerState, TrackerStorage } from '../src/core/state.ts';

export function memoryStorage(): TrackerStorage {
  let snapshot: TrackerState | undefined;

  return {
    async load() { return structuredClone(snapshot); },
    async save(state) { snapshot = structuredClone(state); },
  };
}
