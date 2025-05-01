import { Response } from "express";

//run only when the request is successfull, so no errors
export const appResponder = (
  statusCode: number,
  data: object,
  res: Response
) => {
  res.status(statusCode).json({ ok: true, status: "success", data });
};
