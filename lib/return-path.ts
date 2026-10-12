function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function decodedPath(value: string) {
  let current = value;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!current.includes("%")) return current;
    try {
      const next = decodeURIComponent(current);
      if (next === current) return current;
      current = next;
    } catch {
      return current;
    }
  }
  return current;
}

function localPath(value: string | undefined) {
  if (!value || hasControlCharacter(value)) return null;
  const decoded = decodedPath(value);
  if (!decoded || hasControlCharacter(decoded)) return null;
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\") || decoded.includes("://")) {
    return null;
  }
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !hasControlCharacter(value) && value.length <= 200) {
    return value;
  }
  const limited = decoded.slice(0, 200);
  if (!limited.startsWith("/") || limited.startsWith("//") || hasControlCharacter(limited)) return null;
  return limited;
}

export function safeAdminPath(value: string | undefined) {
  const path = localPath(value);
  if (path?.startsWith("/admin")) return path;
  return "/admin";
}

export function safeNextPath(value: string | undefined) {
  return localPath(value) ?? "/";
}
