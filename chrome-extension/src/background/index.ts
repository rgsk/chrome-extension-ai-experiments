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

// workaround answer
// https://stackoverflow.com/questions/77213045/error-sidepanel-open-may-only-be-called-in-response-to-a-user-gesture-re#:~:text=The%20workaround%20for,Copy
let activeTabId: number | undefined;
// keep alive, see stackoverflow.com/a/66618269
setInterval(chrome.runtime.getPlatformInfo, 25e3);
chrome.runtime.onStartup.addListener(async () => {
  activeTabId = (
    await chrome.tabs.query({ active: true, currentWindow: true })
  )[0]?.id;
});
chrome.tabs.onActivated.addListener((info) => {
  activeTabId = info.tabId;
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidepanel") {
    if (sidePanelOpen) {
      chrome.sidePanel.setOptions({
        tabId: activeTabId,
        enabled: false,
      });
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
            // @ts-expect-error
            chrome.sidePanel.open({ tabId: activeTabId });
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
