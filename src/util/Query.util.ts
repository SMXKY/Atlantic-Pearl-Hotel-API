export class Query {
  private queryObj: Record<string, any>;
  private mongooseQuery: any;

  constructor(queryObj: object, mongooseQuery: any) {
    this.queryObj = { ...queryObj };
    this.mongooseQuery = mongooseQuery;
  }

  public filter() {
    let obj = { ...this.queryObj };

    const excludedFields = [
      "fields",
      "sort",
      "page",
      "limit",
      "search",
      "searchFields",
    ];
    excludedFields.forEach((key) => delete obj[key]);

    let queryStr = JSON.stringify(obj);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in|ne|nin)\b/g,
      (match) => `$${match}`
    );

    const mongoFilter = JSON.parse(queryStr);

    for (const field of Object.values(mongoFilter)) {
      if (typeof field === "object" && field !== null) {
        const f = field as Record<string, any>;
        if (typeof f["$in"] === "string") {
          f["$in"] = f["$in"].split(",").map((v: string) => v.trim());
        }
        if (typeof f["$nin"] === "string") {
          f["$nin"] = f["$nin"].split(",").map((v: string) => v.trim());
        }
      }
    }

    this.mongooseQuery = this.mongooseQuery.find(mongoFilter);
    return this;
  }

  public sort(defaultSort: string = "-createdAt") {
    const sortBy = this.queryObj["sort"]
      ? (this.queryObj["sort"] as string).split(",").join(" ")
      : defaultSort;

    this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    return this;
  }

  public limitFields() {
    // console.log(this.queryObj);
    if (this.queryObj["fields"]) {
      const fields = (this.queryObj["fields"] as string).split(",").join(" ");
      // console.log(fields);
      this.mongooseQuery = this.mongooseQuery.select(fields);
    }
    return this;
  }

  public paginate(defaultPage: number, defaultLimit: number) {
    const page: number = parseInt(this.queryObj["page"]) || defaultPage;
    const limit: number = parseInt(this.queryObj["limit"]) || defaultLimit;
    const skip = (page - 1) * limit;

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);
    return this;
  }

  public getQuery() {
    return this.mongooseQuery;
  }

  public search() {
    const searchTerm = this.queryObj["search"];
    const searchFields = this.queryObj["searchFields"];

    if (!searchTerm || !searchFields) return this;

    const fields = (searchFields as string).split(",").map((f) => f.trim());
    // Escape regex metacharacters so user input is matched literally
    const escaped = (searchTerm as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = { $regex: escaped, $options: "i" };

    this.mongooseQuery = this.mongooseQuery.find({
      $or: fields.map((field) => ({ [field]: searchRegex })),
    });

    return this;
  }
}
