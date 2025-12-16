import { exampleThemeStorage } from "@extension/storage";
import "webextension-polyfill";

exampleThemeStorage.get().then((theme) => {
  console.log("theme", theme);
});

console.log("Background loaded");
console.log(
  "Edit 'chrome-extension/src/background/index.ts' and save to reload.",
);

let sidePanelOpen = false;

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === "mySidepanel") {
    sidePanelOpen = true;
    port.onDisconnect.addListener(async () => {
      sidePanelOpen = false;
    });
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
