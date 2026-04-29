import mongoose from "mongoose";

export async function runWithTransactionRetry<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err: any) {
      await session.abortTransaction();
      const isTransient = err?.errorLabelSet?.has("TransientTransactionError");
      if (isTransient && attempt < maxRetries - 1) {
        attempt++;
        console.warn(
          `TransientTransactionError, retrying attempt ${attempt}...`
        );
        await new Promise((res) => setTimeout(res, 50 * attempt)); // small backoff
        continue;
      }
      throw err;
    } finally {
      session.endSession();
    }
  }
  throw new Error("Transaction failed after max retries");
}
