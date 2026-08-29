function safeEqual(actual: string, expected: string): boolean {
  const length = Math.max(actual.length, expected.length);
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function decodeBasicCredentials(header: string | null): { username: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function validateBasicAuthorization(
  header: string | null,
  expectedUsername: string,
  expectedPassword: string,
): boolean {
  const credentials = decodeBasicCredentials(header);
  if (!credentials) return false;
  return (
    safeEqual(credentials.username, expectedUsername) &&
    safeEqual(credentials.password, expectedPassword)
  );
}
