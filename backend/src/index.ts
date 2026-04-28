import express from "express";
import cors from "cors";
import publicStoreMetadataRouter from "./routes/publicStoreMetadata";
import { rateLimit } from "./middleware/rateLimit";

const app = express();
const port = process.env.PORT || 4000;

// Only the listed origins may call the API from a browser.
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_PER_MINUTE) || 30,
  }),
  publicStoreMetadataRouter
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
