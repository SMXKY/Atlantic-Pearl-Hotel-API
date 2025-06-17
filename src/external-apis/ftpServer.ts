import Client from "ftp";
import fs from "fs";
import path from "path";
import https from "https";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { threadId } from "worker_threads";
import { AppError } from "../util/AppError.util";
import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";

import * as dotenv from "dotenv";
dotenv.config();

interface FtpConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  remoteDir: string;
  remoteUrlBase: string;
}

interface FileUploadRequest {
  files: FileDetail[];
}

interface FileDetail {
  originalname: string;
  stream: NodeJS.ReadableStream;
}

const DEV_UPLOAD_DIR =
  process.env.DEV_UPLOAD_DIR || path.join(__dirname, "../public/uploads");
const DEV_BASE_URL =
  process.env.DEV_BASE_URL || "http://localhost:3000/uploads";

fs.mkdirSync(DEV_UPLOAD_DIR, { recursive: true });

if (
  !process.env.FTP_USER ||
  !process.env.FTP_PASSWORD ||
  !process.env.FTP_HOST ||
  !process.env.FTP_PORT ||
  !process.env.FTP_UPLOAD_DIR ||
  !process.env.FTP_BASE_URL
) {
  throw new Error("Invlid FTP Server configuration");
}

const config: FtpConfig = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
  port: Number(process.env.FTP_PORT),
  remoteDir: process.env.FTP_UPLOAD_DIR,
  remoteUrlBase: process.env.FTP_BASE_URL,
};

// Create temporary directory if it doesn't exist
const tempDir = process.env.TEMP_DIR || path.join(os.tmpdir(), "ftp-uploads");
fs.mkdirSync(tempDir, { recursive: true });

function ensureRemoteDir(client: Client, dir: string): Promise<void> {
  console.log(`Creating directory structure: ${dir}`);
  const parts = dir.split("/").filter(Boolean);
  return parts.reduce((promise: Promise<void>, _, idx: number) => {
    const segment = "/" + parts.slice(0, idx + 1).join("/");
    return promise.then(
      () =>
        new Promise<void>((res, rej) => {
          client.list(segment, (err) => {
            if (err) {
              console.log(`Creating directory: ${segment}`);
              client.mkdir(segment, true, (mkErr) =>
                mkErr ? rej(mkErr) : res()
              );
            } else {
              console.log(`Directory already exists: ${segment}`);
              res();
            }
          });
        })
    );
  }, Promise.resolve());
}

function verifyWebAccess(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 200) {
          console.log("✅ File is accessible via web:", url);
          resolve();
        } else {
          reject(
            new Error(
              `❌ File not accessible via web, status code: ${res.statusCode}`
            )
          );
        }
      })
      .on("error", (err) => {
        reject(new Error(`❌ Error accessing web URL: ${err.message}`));
      });
  });
}

// ─── Upload file to FTP server ─────────────────────────────────────────────────

async function uploadToFTP(
  localFilePath: string,
  remoteFileName: string
): Promise<string> {
  const c = new Client();
  const remotePath = path.posix
    .join(config.remoteDir, remoteFileName)
    .split(" ")
    .join("");
  const fileUrl = // config.remoteUrlBase +
    (config.remoteDir.replace("/", "") + remoteFileName).split(" ").join("");

  return new Promise((resolve, reject) => {
    c.connect({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port,
    });

    console.log("FTP server connected✅✅");

    c.on("ready", async () => {
      try {
        await ensureRemoteDir(c, config.remoteDir);

        const rs = fs.createReadStream(localFilePath);
        await new Promise((res, rej) => {
          c.put(rs, remotePath, (err) => {
            if (err) rej(err);
            res("");
          });
        });

        await new Promise((res, rej) => {
          c.site(`CHMOD 644 ${remotePath}`, (err) => {
            if (err) rej(err);
            res("");
          });
        });

        console.log(`File URL: ${config.remoteUrlBase + fileUrl}`);

        await verifyFile(c, config.remoteDir, remoteFileName);
        await verifyWebAccess(config.remoteUrlBase + fileUrl);

        resolve(`${fileUrl}`);
      } catch (err) {
        reject(err);
      } finally {
        c.end();
      }
    });

    c.on("error", (err) => {
      reject(err);
    });
  });
}

async function handleFileUploadsProduction(
  request: Request
): Promise<string[]> {
  const fileUrls: string[] = [];
  const tempFiles: string[] = [];

  // console.log(request.files);

  try {
    // Check if files are provided in the request
    if (!request.files || request.files.length === 0) {
      throw new Error("No files provided in the request");
    }

    // Process each file
    for (const file of request.files as Express.Multer.File[]) {
      // Generate a unique filename to avoid conflicts
      const uniqueFileName = `${uuidv4()}-${file.originalname}`;

      // Define temporary file path
      const tempFilePath = path.join(tempDir, uniqueFileName);

      // Move the file from multer's temporary storage to our temporary directory
      await new Promise((res, rej) => {
        fs.rename(file.path, tempFilePath, (err) => {
          if (err) rej(err);
          else res("");
        });
      });

      console.log("Heree 11");

      tempFiles.push(tempFilePath);

      // Upload file to FTP server
      const fileUrl = await uploadToFTP(tempFilePath, uniqueFileName);

      console.log("Final URLLLLLLLLL", fileUrl);

      // Add URL to results
      fileUrls.push(fileUrl);
    }

    return fileUrls;
  } finally {
    // Clean up temporary files
    for (const tempFile of tempFiles) {
      try {
        fs.unlinkSync(tempFile);
        console.log(`Deleted temporary file: ${tempFile}`);
      } catch (err) {
        console.error(`Failed to delete temporary file ${tempFile}:`, err);
      }
    }
  }
}

export async function handleFileUploadsDevelopment(
  request: Request
): Promise<string[]> {
  const fileUrls: string[] = [];
  const tempFiles: string[] = [];

  if (
    !request.files ||
    !(request.files instanceof Array) ||
    request.files.length === 0
  ) {
    throw new AppError("No files provided", StatusCodes.BAD_REQUEST);
  }

  for (const file of request.files as Express.Multer.File[]) {
    const uniqueFileName = `${uuidv4()}-${file.originalname}`;

    const destPath = path.join(DEV_UPLOAD_DIR, uniqueFileName);

    await new Promise<void>((res, rej) => {
      fs.rename(file.path, destPath, (err) => {
        if (err) return rej(err);
        res();
      });
    });

    tempFiles.push(destPath);

    const fileUrl = `${DEV_BASE_URL}/${uniqueFileName}`.split(" ").join("");
    fileUrls.push(fileUrl);
  }

  return fileUrls;
}

export const handleFileUploads = (
  req: Request,
  maxSizePerFileInMB: number,
  allowedExtensions: string[]
): Promise<string[]> => {
  const maxSizeBytes = maxSizePerFileInMB * 1024 * 1024;

  if (!req.files || !(req.files instanceof Array)) {
    throw new AppError(
      "No files detected in the Request object",
      StatusCodes.BAD_REQUEST
    );
  }

  // Validate file size and extensions
  req.files.forEach((file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new AppError(
        `Invalid file type: ${ext}. Allowed extensions are: ${allowedExtensions.join(
          ", "
        )}`,
        StatusCodes.BAD_REQUEST
      );
    }

    if (file.size > maxSizeBytes) {
      throw new AppError(
        `File too large: ${file.originalname} exceeds the limit of ${maxSizePerFileInMB} MB`,
        StatusCodes.BAD_REQUEST
      );
    }
  });

  // Delegate to production or development handler
  if (process.env.NODE_ENV === "production") {
    return handleFileUploadsProduction(req);
  } else {
    return handleFileUploadsDevelopment(req);
  }
};

// // ─── File Verification ────────────────────────────────────────────────────────
function verifyFile(
  client: Client,
  remoteDir: string,
  remoteFile: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const remotePath = path.posix
      .join(remoteDir, remoteFile)
      .split(" ")
      .join("");
    client.list(remoteDir, (err, list) => {
      if (err) {
        console.error("❌ Error listing directory contents:", err);
        return reject(err);
      }

      const fileFound = list.some((file) => file.name === remoteFile);
      if (fileFound) {
        console.log("✅ File verified on server:", remotePath);
        resolve();
      } else {
        console.error(`❌ File not found on server: ${remotePath}`);
        reject(new Error(`File not found on server: ${remotePath}`));
      }
    });
  });
}
