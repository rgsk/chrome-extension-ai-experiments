import type { SharedStateType, SharedStorageType } from "../base/index.js";
import { createStorage, StorageEnum } from "../base/index.js";

const storage = createStorage<SharedStateType>(
  "my-stuff-storage-key",
  {
    hideMyStuff: false,
    hideRecents: false,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const sharedStorage: SharedStorageType = {
  ...storage,

  toggleHideMyStuff: async () => {
    await storage.set((state) => ({
      ...state,
      hideMyStuff: !state.hideMyStuff,
    }));
  },

  toggleHideRecents: async () => {
    await storage.set((state) => ({
      ...state,
      hideRecents: !state.hideRecents,
    }));
  },
};
