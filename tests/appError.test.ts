import { describe, expect, it } from "vitest";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../src/util/AppError.util";

describe("AppError", () => {
  it("marks 4xx errors as failed and 5xx errors as server errors", () => {
    expect(new AppError("Not found", StatusCodes.NOT_FOUND).status).toBe("failed");
    expect(new AppError("Boom", StatusCodes.INTERNAL_SERVER_ERROR).status).toBe(
      "server error"
    );
  });

  it("rewrites MongoDB duplicate key errors into a readable message", () => {
    const err = new AppError(
      'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "a@b.com" }',
      StatusCodes.CONFLICT
    );

    expect(err.message).toContain("property of email");
  });

  it("hides cast error details from clients", () => {
    const err = new AppError(
      'Cast to ObjectId failed for value "123" at path "_id"',
      StatusCodes.BAD_REQUEST
    );

    expect(err.message).toBe("Request contains one or more invalid resource IDs.");
  });
});
