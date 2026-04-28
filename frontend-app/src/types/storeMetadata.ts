export type StoreMetadata = {
  isLive: boolean;
  rating?: number;
  ratingsCount?: number;
  currentVersion?: string;
  storeUrl?: string;
};

export type PublicStoreMetadataResponse = {
  ios: StoreMetadata;
  android: StoreMetadata;
};
