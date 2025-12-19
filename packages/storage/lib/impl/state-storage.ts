import { createStorage, StorageEnum } from "../base/index.js";

export const sharedStorage = createStorage(
  "shared-storage-key",
  {
    gemini: {
      hideMyStuffRecentsPreview: false,
    },
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);
