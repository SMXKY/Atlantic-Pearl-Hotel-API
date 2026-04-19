import { Request } from "express";
import { IUser } from "../models/HR/User.model";

export interface ICustomRequest extends Request {
  user: {
    user: IUser;
    permissions: string[];
  };
}
