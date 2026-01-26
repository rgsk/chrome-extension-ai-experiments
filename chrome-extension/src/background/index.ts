import { exampleThemeStorage } from "@extension/storage";
import "webextension-polyfill";

exampleThemeStorage.get().then((theme) => {
  console.log("theme", theme);
});

console.log("Background loaded");
console.log(
  "Edit 'chrome-extension/src/background/index.ts' and save to reload.",
);

async function ensureOffscreenDocument() {
  if (!chrome.offscreen?.createDocument) {
    console.warn("chrome.offscreen is not available in this environment.");
    return;
  }

  if (chrome.offscreen?.hasDocument && (await chrome.offscreen.hasDocument())) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL("offscreen.html"),
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play audio responses that are blocked by page CSP.",
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "play-audio-url") return;
  const url = message?.url;
  if (!url || typeof url !== "string") {
    console.warn("play-audio-url message missing url");
    return;
  }

  void ensureOffscreenDocument()
    .then(() => {
      console.log("Offscreen document ready, sending play request.");
      chrome.runtime.sendMessage({ type: "offscreen-play", url });
    })
    .catch((error) => {
      console.error("Failed to create offscreen document:", error);
    });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-side_panel") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.sidePanel.open({ tabId: tab.id });
      }
    });
  }
});
