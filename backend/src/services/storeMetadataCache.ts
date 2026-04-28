import NodeCache from "node-cache";
import type { StoreMetadata } from "../types/storeMetadata";

const ONE_HOUR_SECONDS = 60 * 60;
const ttlSeconds = Number(process.env.CACHE_TTL_SECONDS ?? ONE_HOUR_SECONDS);
const stdTTL = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : ONE_HOUR_SECONDS;
const cache = new NodeCache({ stdTTL });

type Platform = "ios" | "android";

const cacheKey = (platform: Platform, id: string) => `${platform}:${id}`;

export function getFromCache(
  platform: Platform,
  id: string
): StoreMetadata | undefined {
  return cache.get<StoreMetadata>(cacheKey(platform, id));
}

export function setToCache(
  platform: Platform,
  id: string,
  value: StoreMetadata
): void {
  cache.set(cacheKey(platform, id), value);
}

export function invalidateCache(platform: Platform, id: string): void {
  cache.del(cacheKey(platform, id));
}
