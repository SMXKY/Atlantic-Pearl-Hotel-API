export class Query {
  private queryObj: Record<string, any>;
  private mongooseQuery: any;

  constructor(queryObj: object, mongooseQuery: any) {
    this.queryObj = { ...queryObj };
    this.mongooseQuery = mongooseQuery;
  }

  public filter() {
    let obj = { ...this.queryObj };

    const excludedFields = ["fields", "sort", "page", "limit"];

    excludedFields.forEach((key) => delete obj[key]);

    let queryStr = JSON.stringify(obj);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in|ne|nin)\b/g,
      (match) => `$${match}`
    );

    const mongoFilter = JSON.parse(queryStr);
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
}
