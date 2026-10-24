import { describe, expect, it, vi } from "vitest";
import { StatusCodes } from "http-status-codes";
import { authControllers } from "../src/controllers/Auth/auth.controller";
import { hasPermission } from "../src/util/hasPermission.util";
import { allPermissions } from "../src/types/Permissions.type";
import { parseAllowedIps } from "../src/util/allowedIps.util";

const runRestrictTo = async (locals: Record<string, any>, ...perms: string[]) => {
  const next = vi.fn();
  const middleware = authControllers.restrictTo(...perms);
  middleware({} as any, { locals } as any, next);
  // catchAsync resolves on a later tick
  await new Promise((resolve) => setImmediate(resolve));
  return next;
};

describe("hasPermission", () => {
  it("passes when the user has any one of the required permissions", () => {
    expect(hasPermission(["a", "b"], ["c", "b"])).toBe(true);
  });

  it("fails when the user has none of them", () => {
    expect(hasPermission(["a"], ["b"])).toBe(false);
    expect(hasPermission(undefined, ["b"])).toBe(false);
  });
});

describe("restrictTo middleware", () => {
  const cancel = allPermissions.reservations.cancel;

  it("lets a user with the permission through", async () => {
    const next = await runRestrictTo({ user: { permissions: [cancel] } }, cancel);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a user without the permission with 403", async () => {
    const next = await runRestrictTo({ user: { permissions: [] } }, cancel);

    expect(next.mock.calls[0][0].statusCode).toBe(StatusCodes.FORBIDDEN);
  });

  it("rejects an unauthenticated request with 401", async () => {
    const next = await runRestrictTo({}, cancel);

    expect(next.mock.calls[0][0].statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });
});

describe("parseAllowedIps", () => {
  it("parses a comma-separated list and trims spaces", () => {
    expect(parseAllowedIps("127.0.0.1, 10.0.0.5 ,")).toEqual(["127.0.0.1", "10.0.0.5"]);
  });

  it("defaults to localhost when unset or empty", () => {
    expect(parseAllowedIps(undefined)).toEqual(["127.0.0.1"]);
    expect(parseAllowedIps(" , ")).toEqual(["127.0.0.1"]);
  });
});
