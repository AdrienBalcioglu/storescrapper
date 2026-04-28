import { Router, Request, Response } from "express";
import type { StoreMetadata } from "../types/storeMetadata";
import {
  fetchIosMetadata,
  fetchAndroidMetadata,
} from "../services/storeMetadataProvider";
import {
  getFromCache,
  setToCache,
  invalidateCache,
} from "../services/storeMetadataCache";

const router = Router();

// Bundle IDs and package names: letters, digits, dots, dashes, underscores.
const STORE_ID_PATTERN = /^[A-Za-z0-9._-]{1,155}$/;

router.get("/public-store-metadata", async (req: Request, res: Response) => {
  const iosBundleId =
    typeof req.query.iosBundleId === "string" ? req.query.iosBundleId : "";
  const androidPackageName =
    typeof req.query.androidPackageName === "string"
      ? req.query.androidPackageName
      : "";
  const forceRefresh = req.query.forceRefresh === "true";

  if (
    (iosBundleId && !STORE_ID_PATTERN.test(iosBundleId)) ||
    (androidPackageName && !STORE_ID_PATTERN.test(androidPackageName))
  ) {
    return res.status(400).json({ error: "Invalid bundle ID or package name" });
  }

  if (!iosBundleId && !androidPackageName) {
    return res.status(400).json({
      error: "At least one of iosBundleId or androidPackageName is required",
    });
  }

  try {
    const [iosMetadata, androidMetadata] = await Promise.all([
      resolveMetadata("ios", iosBundleId, forceRefresh, fetchIosMetadata),
      resolveMetadata(
        "android",
        androidPackageName,
        forceRefresh,
        fetchAndroidMetadata
      ),
    ]);

    return res.json({
      ios: iosMetadata,
      android: androidMetadata,
    });
  } catch (error) {
    console.error("Failed to fetch store metadata", error);
    return res.status(200).json({
      ios: { isLive: false },
      android: { isLive: false },
    });
  }
});

async function resolveMetadata(
  platform: "ios" | "android",
  id: string,
  forceRefresh: boolean,
  fetcher: (id: string | undefined) => Promise<StoreMetadata>
): Promise<StoreMetadata> {
  if (!id) {
    return { isLive: false };
  }

  if (forceRefresh) {
    invalidateCache(platform, id);
  } else {
    const cached = getFromCache(platform, id);
    if (cached) {
      return cached;
    }
  }

  const result = await fetcher(id);
  setToCache(platform, id, result);
  return result;
}

export default router;
