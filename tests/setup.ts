import "dotenv/config";

process.env.APP_ENV = process.env.APP_ENV || "development";
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
