import dotenv from "dotenv";

dotenv.config();

// Comma-separated list in ALLOWED_IPS, e.g. "127.0.0.1,203.0.113.10"
export const parseAllowedIps = (value: string | undefined): string[] => {
  const ips = (value || "127.0.0.1")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  return ips.length ? ips : ["127.0.0.1"];
};

export const allowedIps = parseAllowedIps(process.env.ALLOWED_IPS);
