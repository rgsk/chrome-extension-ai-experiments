import { sharedStorage } from "@extension/storage";
import { sampleFunction } from "@src/sample-function";

console.log("[CEB] All content script loaded");

void sampleFunction();

chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  if (msg.type === "PAGE_DIMENSIONS") {
    sendResponse({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    });
  }

  if (msg.type === "SCROLL_TO") {
    window.scrollTo(0, msg.y);
    setTimeout(sendResponse, 300);
    return true;
  }
});

if (window.location.origin === "https://gemini.google.com") {
  const hideRecents = async () => {
    const el = document.querySelector(
      "my-stuff-recents-preview",
    ) as HTMLElement;
    if (el) {
      const { hideMyStuff } = await sharedStorage.get();
      if (hideMyStuff) {
        el.style.display = "none";
      }
    }
  };

  // run once in case it already exists
  hideRecents();

  // watch for future DOM changes
  const observer = new MutationObserver(() => {
    hideRecents();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
