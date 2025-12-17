/* eslint-disable func-style */
import { exampleThemeStorage } from "@extension/storage";
import "webextension-polyfill";

exampleThemeStorage.get().then((theme) => {
  console.log("theme", theme);
});

console.log("Background loaded");
console.log(
  "Edit 'chrome-extension/src/background/index.ts' and save to reload.",
);

const sidePanelOpenByTab = new Map<number, boolean>();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "mySidepanel") return;

  let tabId: number | undefined;

  port.onMessage.addListener((msg) => {
    tabId = msg.tabId;
    activeTabId = tabId;
    console.log({ "msg.tabId": msg.tabId });
    if (msg.type === "init" && typeof tabId === "number") {
      sidePanelOpenByTab.set(tabId, true);
    }
  });

  port.onDisconnect.addListener(() => {
    if (typeof tabId === "number") {
      sidePanelOpenByTab.set(tabId, false);
    }
  });
});

let activeTabId: number | undefined;
let activeWindowId: number | undefined;

async function updateActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  activeTabId = tab?.id;
  activeWindowId = tab?.windowId;
}

// Initial load
chrome.runtime.onStartup.addListener(updateActiveTab);
chrome.runtime.onInstalled.addListener(updateActiveTab);

// Tab changes
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  activeTabId = tabId;
  activeWindowId = windowId;
});

// Window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    updateActiveTab();
  }
});

async function closeAllSidePanels() {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.id) continue;

    chrome.sidePanel.setOptions({
      tabId: tab.id,
      enabled: false,
    });
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidepanel") {
    if (activeTabId !== undefined && sidePanelOpenByTab.get(activeTabId)) {
      // chrome.sidePanel.setOptions({
      //   tabId: activeTabId,
      //   enabled: false,
      // });
      closeAllSidePanels();
    } else {
      if (activeTabId) {
        // after tab change this method will continue to work always
        chrome.sidePanel.setOptions(
          {
            tabId: activeTabId,
            enabled: true,
            path: "side-panel/index.html",
          },
          () => {
            if (activeTabId) {
              chrome.sidePanel.open({ tabId: activeTabId });
            }
          },
        );
      } else {
        // if you won't change tab from chrome://extensions, below works for just 1 time
        // after opening and closing once sidepanel, then if we try to open, this method will fail
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (tab?.id) {
            chrome.sidePanel.open({ tabId: tab.id });
          }
        });
      }
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "react-ai-experiments_EVENT") {
    console.log("Received from iframe:", message.payload);

    // Example: persist data
    // chrome.storage.local.set({ lastEvent: message.payload });

    sendResponse({ status: "ok", name: "Rahul" });
  } else if (message.type === "IFRAME_EVENT") {
    console.log("Received from sidepanel:", message.payload);

    // Example: persist data
    // chrome.storage.local.set({ lastEvent: message.payload });

    sendResponse({ status: "ok", name: "Mehak" });
  }

  // REQUIRED if async
  return true;
});
