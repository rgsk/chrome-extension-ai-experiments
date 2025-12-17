import type { MessageFromServiceWorkerToSidePanelPayload } from "@extension/shared";
import { exampleThemeStorage } from "@extension/storage";
import "webextension-polyfill";

exampleThemeStorage.get().then((theme) => {
  console.log("theme", theme);
});

console.log("Background loaded");
console.log(
  "Edit 'chrome-extension/src/background/index.ts' and save to reload.",
);

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-side_panel") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.sidePanel.open({ tabId: tab.id });
      }
    });
  }
});

const sendMessageToSidepanel = (
  payload: MessageFromServiceWorkerToSidePanelPayload,
) => {
  chrome.runtime.sendMessage({
    type: "message-from-service_worker-to-side_panel",
    payload,
  });
};

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);

  sendMessageToSidepanel({
    type: "TAB_ACTIVATED",
    body: { tab },
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    sendMessageToSidepanel({
      type: "TAB_UPDATED",
      body: { tab },
    });
  }
});
