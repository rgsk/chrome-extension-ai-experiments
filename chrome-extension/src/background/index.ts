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
  if (command === "open-sidepanel") {
    if (sidePanelOpen) {
      chrome.sidePanel.setOptions({
        tabId: activeTabId,
        enabled: false,
      });
    } else {
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
    }
  }
});
