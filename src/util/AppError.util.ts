export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);

    if (message.startsWith("E11000")) {
      const split = message.split(" ");
      split.forEach((word, index) => {
        if (word === "{") {
          const prop = `${split[index + 1]}`.split("");
          prop.pop();

          message = `Duplicate key error: You are attempting to create a resource(s) with a property of ${prop.join(
            ""
          )} that is not unique. Try changing the value of ${prop.join("")}!`;
        }
      });
    }

    if (message.startsWith("Cast")) {
      message = "Request contains one or more invalid resource IDs.";
    }

    this.message = message;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "failed" : "server error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
