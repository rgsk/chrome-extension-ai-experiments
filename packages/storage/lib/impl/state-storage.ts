import { createStorage, StorageEnum } from "../base/index.js";

export const sharedStorage = createStorage(
  "shared-storage-key",
  {
    gemini: {
      hideMyStuffRecentsPreview: false,
    },
    cses: {
      problemBookmarksEnabled: true,
      bookmarks: {} as Record<string, Record<string, boolean>>,
    },
    leetcode: {
      hideLockedLinks: true,
    },
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);
