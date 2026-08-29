/**
 * Server-only guard.
 *
 * The `server-only` npm package throws on any import outside a React Server
 * Component, which also breaks the CLI scripts and the test runner. This module
 * keeps the intent — these files must never reach the browser, because they
 * read secrets and touch the filesystem — while remaining importable from
 * plain Node.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "This module is server-only. It reads environment secrets and the local filesystem, and must not be imported from a Client Component.",
  );
}

export {};
