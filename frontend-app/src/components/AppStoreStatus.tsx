import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  PublicStoreMetadataResponse,
  StoreMetadata,
} from "../types/storeMetadata";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export type AppStoreStatusProps = {
  iosBundleId?: string;
  androidPackageName?: string;
};

type StatusState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; data: PublicStoreMetadataResponse };

export function AppStoreStatus({
  iosBundleId,
  androidPackageName,
}: AppStoreStatusProps) {
  const [state, setState] = useState<StatusState>({ status: "idle" });
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const hasValidIds = Boolean(iosBundleId || androidPackageName);

  const fetchMetadata = useCallback(
    async (forceRefresh = false) => {
      if (!hasValidIds) {
        if (isMountedRef.current) {
          setState({ status: "error" });
        }
        return;
      }

      if (isMountedRef.current) {
        setState({ status: "loading" });
      }
      const params = new URLSearchParams();
      if (iosBundleId) params.append("iosBundleId", iosBundleId);
      if (androidPackageName)
        params.append("androidPackageName", androidPackageName);
      if (forceRefresh) params.append("forceRefresh", "true");

      const url = `${API_BASE_URL}/public-store-metadata?${params.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Unable to fetch store data");
        }
        const data: PublicStoreMetadataResponse = await response.json();
        if (isMountedRef.current) {
          setState({ status: "success", data });
        }
      } catch (error) {
        console.error("Failed to fetch public store metadata", error);
        if (isMountedRef.current) {
          setState({ status: "error" });
        }
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [androidPackageName, hasValidIds, iosBundleId]
  );

  useEffect(() => {
    fetchMetadata(false);
  }, [fetchMetadata]);

  const iosMetadata: StoreMetadata = useMemo(() => {
    return state.status === "success" ? state.data.ios : { isLive: false };
  }, [state]);

  const androidMetadata: StoreMetadata = useMemo(() => {
    return state.status === "success" ? state.data.android : { isLive: false };
  }, [state]);

  const renderStoreCard = (
    label: string,
    metadata: StoreMetadata,
    variant: "ios" | "android"
  ) => {
    const isLoading = state.status === "loading";

    return (
      <article className={`store-card store-card--${variant}`}>
        <header className="store-card__header">
          <div className="store-card__title">
            <div className={`store-card__logo store-card__logo--${variant}`}></div>
            <span>{label}</span>
          </div>
          {metadata.isLive && metadata.currentVersion && (
            <span className="store-card__badge">
              Version {metadata.currentVersion}
            </span>
          )}
        </header>

        {isLoading ? (
          <div className="store-card__skeleton" />
        ) : !metadata.isLive ? (
          <p className="store-card__muted">
            Not live on {variant === "ios" ? "App Store" : "Google Play"}
          </p>
        ) : (
          <div>
            <p className="store-card__rating">
              Rating: <strong>{metadata.rating?.toFixed(1) ?? "N/A"}</strong>
              {metadata.ratingsCount != null && (
                <span className="store-card__muted">
                  {` (${metadata.ratingsCount} reviews)`}
                </span>
              )}
            </p>
            {metadata.storeUrl && (
              <a
                className="store-card__link"
                href={metadata.storeUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                Open store listing
              </a>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <section className="app-store-status">
      <div className="app-store-status__header">
        <div>
          <h2>App Store Status</h2>
          <p className="store-card__muted">
            Track the live rating and version directly from Apple & Google.
          </p>
        </div>
        <button
          type="button"
          className="app-store-status__refresh"
          onClick={() => fetchMetadata(true)}
          disabled={state.status === "loading"}
        >
          {state.status === "loading" ? "Refreshing..." : "Refresh store data"}
        </button>
      </div>

      {state.status === "error" && (
        <p className="app-store-status__error">Unable to fetch store data</p>
      )}

      <div className="app-store-status__cards">
        {renderStoreCard("Google Play", androidMetadata, "android")}
        {renderStoreCard("App Store", iosMetadata, "ios")}
      </div>
    </section>
  );
}
