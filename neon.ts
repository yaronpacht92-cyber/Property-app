import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  preview: {
    buckets: {
      // Private S3-compatible storage for property photos and documents.
      uploads: {},
    },
  },
});
