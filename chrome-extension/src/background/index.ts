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
  if (message?.type === "play-audio-url") {
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
    return;
  }

  if (message?.type === "play-tts") {
    const text = message?.text;
    const voice = message?.voice;
    if (!text || typeof text !== "string") {
      console.warn("play-tts message missing text");
      return;
    }

    void ensureOffscreenDocument()
      .then(() => {
        console.log("Offscreen document ready, sending TTS request.");
        chrome.runtime.sendMessage({ type: "offscreen-tts", text, voice });
      })
      .catch((error) => {
        console.error("Failed to create offscreen document:", error);
      });
    return;
  }

  if (message?.type === "offscreen-tts-stop") {
    void ensureOffscreenDocument()
      .then(() => {
        console.log("Offscreen document ready, sending TTS stop request.");
        chrome.runtime.sendMessage({ type: "offscreen-tts-stop" });
      })
      .catch((error) => {
        console.error("Failed to create offscreen document:", error);
      });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-side_panel") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.sidePanel.open({ tabId: tab.id });
      }
    });
  }
  if (command === "play-selected-text") {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (!tab?.id) return;
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection?.()?.toString() ?? "",
      });
      const selectedText = result[0]?.result ?? "";
      const text = selectedText.trim();
      const voice = "alloy";
      void ensureOffscreenDocument()
        .then(() => {
          console.log("Offscreen document ready, sending TTS request.");
          chrome.runtime.sendMessage({ type: "offscreen-tts", text, voice });
        })
        .catch((error) => {
          console.error("Failed to create offscreen document:", error);
        });
    });
  }
});
