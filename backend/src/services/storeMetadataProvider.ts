import appStore from "app-store-scraper";
import gplay from "google-play-scraper";
import type { StoreMetadata } from "../types/storeMetadata";

export async function fetchIosMetadata(
  iosBundleId: string | undefined
): Promise<StoreMetadata> {
  if (!iosBundleId) {
    return { isLive: false };
  }

  try {
    const app = await appStore.app({ id: iosBundleId });
    const metadata: StoreMetadata = {
      isLive: true,
    };

    if (typeof app.score === "number") {
      metadata.rating = app.score;
    }
    if (typeof app.reviews === "number") {
      metadata.ratingsCount = app.reviews;
    }
    if (typeof app.version === "string" && app.version.length > 0) {
      metadata.currentVersion = app.version;
    }
    if (typeof app.url === "string" && app.url.length > 0) {
      metadata.storeUrl = app.url;
    }

    return metadata;
  } catch (error) {
    console.error("Failed to fetch iOS metadata", error);
    return { isLive: false };
  }
}

export async function fetchAndroidMetadata(
  androidPackageName: string | undefined
): Promise<StoreMetadata> {
  if (!androidPackageName) {
    return { isLive: false };
  }

  try {
    const app = await gplay.app({ appId: androidPackageName });
    const metadata: StoreMetadata = {
      isLive: true,
    };

    if (typeof app.score === "number") {
      metadata.rating = app.score;
    }
    if (typeof app.ratings === "number") {
      metadata.ratingsCount = app.ratings;
    }
    if (typeof app.version === "string" && app.version.length > 0) {
      metadata.currentVersion = app.version;
    }
    if (typeof app.url === "string" && app.url.length > 0) {
      metadata.storeUrl = app.url;
    }

    return metadata;
  } catch (error) {
    console.error("Failed to fetch Android metadata", error);
    return { isLive: false };
  }
}
