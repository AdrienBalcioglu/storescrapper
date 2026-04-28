declare module "app-store-scraper" {
  export interface IOSApp {
    score?: number;
    reviews?: number;
    version?: string;
    url?: string;
  }
  export function app(params: { id: string }): Promise<IOSApp>;
}

declare module "google-play-scraper" {
  export interface AndroidApp {
    score?: number;
    ratings?: number;
    version?: string;
    url?: string;
  }
  export function app(params: { appId: string }): Promise<AndroidApp>;
  const _default: {
    app: typeof app;
  };
  export default _default;
}
