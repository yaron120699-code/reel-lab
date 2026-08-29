import { describe, expect, it } from "vitest";

import { validateBasicAuthorization } from "@/lib/auth/basic";

function basic(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

describe("private lab authorization", () => {
  it("accepts the exact configured credentials", () => {
    expect(validateBasicAuthorization(basic("pessi", "long-secret"), "pessi", "long-secret")).toBe(
      true,
    );
  });

  it("keeps colons inside the password", () => {
    expect(validateBasicAuthorization(basic("pessi", "one:two"), "pessi", "one:two")).toBe(true);
  });

  it.each([
    [null, "missing header"],
    ["Bearer something", "wrong scheme"],
    ["Basic not-base64!", "malformed value"],
    [basic("someone", "long-secret"), "wrong username"],
    [basic("pessi", "wrong-secret"), "wrong password"],
  ])("rejects %s (%s)", (header, _description) => {
    expect(validateBasicAuthorization(header, "pessi", "long-secret")).toBe(false);
  });
});
