export class Query {
  private queryObj: Record<string, any>;
  private mongooseQuery: any;

  constructor(queryObj: object, mongooseQuery: any) {
    this.queryObj = { ...queryObj };
    this.mongooseQuery = mongooseQuery;
  }

  public filter() {
    const excludedFields = ["fields", "sort", "page", "limit"];
    excludedFields.forEach((key) => delete this.queryObj[key]);

    // Advanced filtering: convert to MongoDB operators
    let queryStr = JSON.stringify(this.queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);

    const mongoFilter = JSON.parse(queryStr);
    this.mongooseQuery = this.mongooseQuery.find(mongoFilter);

    return this;
  }

  // Optional chaining methods for sort, pagination, etc.
  public sort() {
    if (this.queryObj["sort"]) {
      const sortBy = (this.queryObj["sort"] as string).split(",").join(" ");
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    }
    return this;
  }

  public limitFields() {
    if (this.queryObj["fields"]) {
      const fields = (this.queryObj["fields"] as string).split(",").join(" ");
      this.mongooseQuery = this.mongooseQuery.select(fields);
    }
    return this;
  }

  public paginate(defaultPage: number, defaultLimit: number) {
    const page: number = Number(this.queryObj["page"] as string) || defaultPage;
    const limit: number =
      Number(this.queryObj["limit"] as string) || defaultLimit;
    const skip = (page - 1) * limit;

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);
    return this;
  }

  public getQuery() {
    return this.mongooseQuery;
  }
}
