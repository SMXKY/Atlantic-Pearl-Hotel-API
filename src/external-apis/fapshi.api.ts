import axios, { AxiosRequestConfig } from "axios";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../util/AppError.util";

import * as dotEnv from "dotenv";

dotEnv.config();

if (
  !process.env.FAPSHI_SANDBOX_BASE_URL ||
  !process.env.FAPSHI_USER_DEV ||
  !process.env.FAPSHI_API_KEY_DEV
) {
  console.log(
    process.env.FAPSHI_SANDBOX_BASE_URL,
    process.env.FAPSHI_USER_DEV,
    process.env.FAPSHI_API_KEY_DEV
  );
  throw new AppError(
    "Cannot find fapshi enviroment variables",
    StatusCodes.INTERNAL_SERVER_ERROR
  );
}

const baseUrl = process.env.FAPSHI_SANDBOX_BASE_URL;
const headers: Record<string, string> = {
  apiuser: process.env.FAPSHI_USER_DEV,
  apikey: process.env.FAPSHI_API_KEY_DEV,
};

export interface InitiatePayData {
  amount: number;
  email?: string;
  userId?: string;
  externalId?: string;
  redirectUrl?: string;
  message?: string;
}

interface DirectPayData extends InitiatePayData {
  phone: string;
  medium?: string;
  name?: string;
}

interface SearchParams {
  status?: "created" | "successful" | "failed" | "expired";
  medium?: string;
  start?: string;
  end?: string;
  amt?: number;
  limit?: number;
  sort?: "asc" | "desc";
}

function error(message: string, statusCode: number) {
  return { message, statusCode };
}

/**
 * This function returns an object with the link where a user is to be redirected in order to complete their payment.
 *
 * Usage Example:
 *
 * import { initiatePay } from './fapshiClient';
 *
 * async function initiatePayment() {
 *   const result = await initiatePay({
 *     amount: 500,
 *     email: "user@example.com",
 *     redirectUrl: "https://yourapp.com/redirect"
 *   });
 *   console.log(result);
 * }
 *
 * @param data - Object containing payment initialization details.
 * @returns A promise that resolves with the API response.
 */
export function initiatePay(data: InitiatePayData): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      if (!data?.amount) return resolve(error("amount required", 400));
      if (!Number.isInteger(data.amount))
        return resolve(error("amount must be of type integer", 400));
      if (data.amount < 100)
        return resolve(error("amount cannot be less than 100 XAF", 400));

      const config: AxiosRequestConfig = {
        method: "post",
        url: baseUrl + "/initiate-pay",
        headers,
        data,
      };
      const response = await axios(config);
      response.data.statusCode = response.status;
      resolve(response.data);
    } catch (e: any) {
      e.response.data.statusCode = e?.response?.status;
      resolve(e.response.data);
    }
  });
}

/**
 * This function directly initiates a payment request to a user's mobile device and
 * returns an object with a transId property that is used to get the status of the payment.
 *
 * Below is a parameter template. amount and phone are required.
 *
 *     data = {
 *         amount: number,
 *         phone: string,
 *         medium?: string,
 *         name?: string,
 *         email?: string,
 *         userId?: string,
 *         externalId?: string,
 *         message?: string
 *     }
 */
export function directPay(data: DirectPayData): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      if (!data?.amount) return resolve(error("amount required", 400));
      if (!Number.isInteger(data.amount))
        return resolve(error("amount must be of type integer", 400));
      if (data.amount < 100)
        return resolve(error("amount cannot be less than 100 XAF", 400));
      if (!data?.phone) return resolve(error("phone number required", 400));
      if (typeof data.phone !== "string")
        return resolve(error("phone must be of type string", 400));
      if (!/^6[\d]{8}$/.test(data.phone))
        return resolve(error("invalid phone number", 400));

      const config: AxiosRequestConfig = {
        method: "post",
        url: baseUrl + "/direct-pay",
        headers,
        data,
      };
      const response = await axios(config);
      response.data.statusCode = response.status;
      resolve(response.data);
    } catch (e: any) {
      e.response.data.statusCode = e?.response?.status;
      resolve(e.response.data);
    }
  });
}

/**
 * This function returns an object containing the details of the transaction associated with the Id passed as parameter
 */
export function paymentStatus(transId: string): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      if (!transId || typeof transId !== "string")
        return resolve(error("invalid type, string expected", 400));
      if (!/^[a-zA-Z0-9]{8,10}$/.test(transId))
        return resolve(error("invalid transaction id", 400));

      const config: AxiosRequestConfig = {
        method: "get",
        url: baseUrl + "/payment-status/" + transId,
        headers,
      };
      const response = await axios(config);
      response.data.statusCode = response.status;
      resolve(response.data);
    } catch (e: any) {
      e.response.data.statusCode = e?.response?.status;
      resolve(e.response.data);
    }
  });
}

/**
 * This function expires the transaction associated with the Id passed as parameter and returns an object containing the details of the transaction
 */
export function expirePay(transId: string): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      if (!transId || typeof transId !== "string")
        return resolve(error("invalid type, string expected", 400));
      if (!/^[a-zA-Z0-9]{8,10}$/.test(transId))
        return resolve(error("invalid transaction id", 400));

      const config: AxiosRequestConfig = {
        method: "post",
        url: baseUrl + "/expire-pay",
        data: { transId },
        headers,
      };
      const response = await axios(config);
      response.data.statusCode = response.status;
      resolve(response.data);
    } catch (e: any) {
      e.response.data.statusCode = e?.response?.status;
      resolve(e.response.data);
    }
  });
}

/**
 * This function returns an array of objects containing the transaction details of the user Id passed as parameter
 */
export function userTrans(userId: string): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      if (!userId || typeof userId !== "string")
        return resolve(error("invalid type, string expected", 400));
      if (!/^[a-zA-Z0-9-_]{1,100}$/.test(userId))
        return resolve(error("invalid user id", 400));

      const config: AxiosRequestConfig = {
        method: "get",
        url: baseUrl + "/transaction/" + userId,
        headers,
      };
      const response = await axios(config);
      resolve(response.data);
    } catch (e: any) {
      e.response.data.statusCode = e?.response?.status;
      resolve(e.response.data);
    }
  });
}

/**
 * This function returns an object containing the balance of a service
 */
export function balance(): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      const config: AxiosRequestConfig = {
        method: "get",
        url: baseUrl + "/balance",
        headers,
      };
      const response = await axios(config);
      response.data.statusCode = response.status;
      resolve(response.data);
    } catch (e: any) {
      e.response.data.statusCode = e?.response?.status;
      resolve(e.response.data);
    }
  });
}

/**
 * This function performs a payout to the phone number specified in the data parameter and
 * returns an object with a transId property that is used to get the status of the payment
 *
 * Note: In the live environment, payouts must be enabled for this to work. Contact support if needed.
 */
export function payout(data: DirectPayData): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      if (!data?.amount) return resolve(error("amount required", 400));
      if (!Number.isInteger(data.amount))
        return resolve(error("amount must be of type integer", 400));
      if (data.amount < 100)
        return resolve(error("amount cannot be less than 100 XAF", 400));
      if (!data?.phone) return resolve(error("phone number required", 400));
      if (typeof data.phone !== "string")
        return resolve(error("phone must be of type string", 400));
      if (!/^6[\d]{8}$/.test(data.phone))
        return resolve(error("invalid phone number", 400));

      const config: AxiosRequestConfig = {
        method: "post",
        url: baseUrl + "/payout",
        headers,
        data,
      };
      const response = await axios(config);
      response.data.statusCode = response.status;
      resolve(response.data);
    } catch (e: any) {
      e.response.data.statusCode = e?.response?.status;
      resolve(e.response.data);
    }
  });
}

/**
 * This function returns an array containing the transactions that satisfy
 * the criteria specified in the parameter passed to the function
 */
export function search(params: SearchParams = {}): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      const config: AxiosRequestConfig = {
        method: "get",
        url: baseUrl + "/search",
        params,
        headers,
      };
      const response = await axios(config);
      resolve(response.data);
    } catch (e: any) {
      e.response.data.statusCode = e?.response?.status;
      resolve(e.response.data);
    }
  });
}
