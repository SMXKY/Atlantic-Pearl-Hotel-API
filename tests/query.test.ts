import { describe, expect, it } from "vitest";
import { Query } from "../src/util/Query.util";

// Records every chained call so tests can assert on the MongoDB query built
const fakeMongooseQuery = () => {
  const calls: Record<string, any[]> = {};
  const record =
    (name: string) =>
    (...args: any[]) => {
      (calls[name] ??= []).push(...args);
      return query;
    };
  const query: any = {
    calls,
    find: record("find"),
    sort: record("sort"),
    select: record("select"),
    skip: record("skip"),
    limit: record("limit"),
  };
  return query;
};

describe("Query.filter", () => {
  it("turns comparison operators into MongoDB operators", () => {
    const q = fakeMongooseQuery();
    new Query({ price: { gte: "100", lt: "500" } }, q).filter();

    expect(q.calls.find[0]).toEqual({ price: { $gte: "100", $lt: "500" } });
  });

  it("splits comma-separated $in and $nin values", () => {
    const q = fakeMongooseQuery();
    new Query({ status: { in: "available, cleaning" } }, q).filter();

    expect(q.calls.find[0]).toEqual({
      status: { $in: ["available", "cleaning"] },
    });
  });

  it("ignores pagination, sorting and search parameters", () => {
    const q = fakeMongooseQuery();
    new Query(
      { page: "2", limit: "10", sort: "-price", fields: "name", search: "x", floor: "3" },
      q
    ).filter();

    expect(q.calls.find[0]).toEqual({ floor: "3" });
  });
});

describe("Query.sort / limitFields / paginate", () => {
  it("uses the default sort when none is given", () => {
    const q = fakeMongooseQuery();
    new Query({}, q).sort();

    expect(q.calls.sort).toEqual(["-createdAt"]);
  });

  it("converts comma-separated sort and field lists", () => {
    const q = fakeMongooseQuery();
    new Query({ sort: "-price,name", fields: "name,price" }, q)
      .sort()
      .limitFields();

    expect(q.calls.sort).toEqual(["-price name"]);
    expect(q.calls.select).toEqual(["name price"]);
  });

  it("computes skip and limit from page and limit", () => {
    const q = fakeMongooseQuery();
    new Query({ page: "3", limit: "20" }, q).paginate(1, 10);

    expect(q.calls.skip).toEqual([40]);
    expect(q.calls.limit).toEqual([20]);
  });

  it("falls back to defaults for invalid page values", () => {
    const q = fakeMongooseQuery();
    new Query({ page: "abc" }, q).paginate(1, 10);

    expect(q.calls.skip).toEqual([0]);
    expect(q.calls.limit).toEqual([10]);
  });
});

describe("Query.search", () => {
  it("searches every listed field case-insensitively", () => {
    const q = fakeMongooseQuery();
    new Query({ search: "pearl", searchFields: "name, email" }, q).search();

    expect(q.calls.find[0]).toEqual({
      $or: [
        { name: { $regex: "pearl", $options: "i" } },
        { email: { $regex: "pearl", $options: "i" } },
      ],
    });
  });

  it("escapes regex characters in user input", () => {
    const q = fakeMongooseQuery();
    new Query({ search: "a.*(b", searchFields: "name" }, q).search();

    expect(q.calls.find[0].$or[0].name.$regex).toBe("a\\.\\*\\(b");
  });

  it("does nothing without both search and searchFields", () => {
    const q = fakeMongooseQuery();
    new Query({ search: "pearl" }, q).search();

    expect(q.calls.find).toBeUndefined();
  });
});
