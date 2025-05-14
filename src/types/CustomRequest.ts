import { Request } from "express";
import { IUser } from "../models/User.model";

export interface ICustomRequest extends Request {
  user: {
    user: IUser;
    permissions: string[];
  };
}
