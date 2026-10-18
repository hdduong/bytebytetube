const MODEL_HOSTS = ["huggingface.co", "hf.co", "openai.com", "fal.ai", "fal.run", "midscene.com"];

type GuardState = {
  hooked: boolean;
  wrapper?: typeof globalThis.fetch;
  underlying?: typeof globalThis.fetch;
  blocked: string[];
};

const globalGuard = globalThis as typeof globalThis & {
  __cinematubeModelHostGuard?: GuardState;
};

function guardState() {
  globalGuard.__cinematubeModelHostGuard ??= { hooked: false, blocked: [] };
  return globalGuard.__cinematubeModelHostGuard;
}

export function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function hostnameOf(url: string) {
  try {
    return new URL(url, "http://127.0.0.1").hostname;
  } catch {
    return "";
  }
}

export function isModelHost(hostname: string) {
  return MODEL_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function modelHostGuardInstalled() {
  const state = guardState();
  return Boolean(state.wrapper) && globalThis.fetch === state.wrapper;
}

export function blockedModelHosts() {
  return guardState().blocked;
}

export function resetBlockedModelHosts() {
  guardState().blocked.length = 0;
}

function rememberFetch(state: GuardState, next: typeof globalThis.fetch) {
  if (next === state.wrapper) return;
  state.underlying = next.bind(globalThis);
}

export function installModelHostGuard() {
  const state = guardState();
  if (state.hooked && globalThis.fetch === state.wrapper) return;

  if (!state.hooked) {
    rememberFetch(state, globalThis.fetch);
    const wrapped: typeof globalThis.fetch = async (input, init) => {
      const url = requestUrl(input);
      if (isModelHost(hostnameOf(url))) {
        state.blocked.push(hostnameOf(url));
        throw new Error(`Refusing network model request during local visual tests: ${hostnameOf(url)}`);
      }
      const underlying = state.underlying;
      if (!underlying) throw new Error("Model host guard has no fetch implementation");
      return underlying(input, init);
    };
    state.wrapper = wrapped;
    // Next dev assigns the original fetch back whenever it rebuilds a route.
    // A setter keeps this wrapper in place and guards whatever fetch it restores.
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      enumerable: true,
      get() {
        return state.wrapper;
      },
      set(next: typeof globalThis.fetch) {
        rememberFetch(state, next);
      },
    });
    state.hooked = true;
    return;
  }

  rememberFetch(state, globalThis.fetch);
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    enumerable: true,
    get() {
      return state.wrapper;
    },
    set(next: typeof globalThis.fetch) {
      rememberFetch(state, next);
    },
  });
}
