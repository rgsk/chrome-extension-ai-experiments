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
