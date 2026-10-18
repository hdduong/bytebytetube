const MODEL_HOSTS = ["huggingface.co", "hf.co", "openai.com", "fal.ai", "fal.run", "midscene.com"];

type GuardState = {
  installed: boolean;
  blocked: string[];
};

const globalGuard = globalThis as typeof globalThis & {
  __cinematubeModelHostGuard?: GuardState;
};

function guardState() {
  globalGuard.__cinematubeModelHostGuard ??= { installed: false, blocked: [] };
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
  return guardState().installed;
}

export function blockedModelHosts() {
  return guardState().blocked;
}

export function resetBlockedModelHosts() {
  guardState().blocked.length = 0;
}

export function installModelHostGuard() {
  const state = guardState();
  if (state.installed) return;
  state.installed = true;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    if (isModelHost(hostnameOf(url))) {
      state.blocked.push(hostnameOf(url));
      throw new Error(`Refusing network model request during local visual tests: ${hostnameOf(url)}`);
    }
    return original(input, init);
  };
}
