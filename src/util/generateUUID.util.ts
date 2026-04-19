import { v4 as uuidv4 } from "uuid";
import { IPTVLogModel } from "../models/IPTV/IPTVLogs.model";

export const generateIdentifyToken = async (): Promise<string> => {
  let token: string;
  let exists: { _id: unknown } | null = null;

  do {
    token = uuidv4().replace(/-/g, "").slice(0, 32);
    exists = await IPTVLogModel.exists({ identify: token });
  } while (exists);

  return token;
};
