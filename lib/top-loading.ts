const listeners = new Set<() => void>();
const activeOperations = new Set<symbol>();
let snapshot: "idle" | "loading" | "finishing" = "idle";
let finishTimeout: ReturnType<typeof setTimeout> | undefined;

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeToTopLoading(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTopLoadingSnapshot() {
  return snapshot;
}

export function startTopLoading() {
  if (finishTimeout) {
    clearTimeout(finishTimeout);
    finishTimeout = undefined;
  }
  const operation = Symbol("top-loading");
  activeOperations.add(operation);
  snapshot = "loading";
  notify();

  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    activeOperations.delete(operation);
    if (activeOperations.size === 0) {
      snapshot = "finishing";
      finishTimeout = setTimeout(() => {
        finishTimeout = undefined;
        snapshot = "idle";
        notify();
      }, 260);
    }
    notify();
  };
}
