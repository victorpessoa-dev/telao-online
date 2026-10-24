import { describe, expect, it } from "vitest";
import { RequestTimeoutError, withTimeout } from "@/lib/utils/async";

describe("withTimeout", () => {
  it("returns a request result before the deadline", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 100)).resolves.toBe("ok");
  });

  it("rejects a request that exceeds the deadline", async () => {
    await expect(
      withTimeout(new Promise(() => {}), 1, "A requisição expirou."),
    ).rejects.toEqual(expect.objectContaining({
      name: "RequestTimeoutError",
      message: "A requisição expirou.",
    }));
  });

  it("exposes a specific timeout error type", () => {
    expect(new RequestTimeoutError()).toBeInstanceOf(Error);
  });
});
