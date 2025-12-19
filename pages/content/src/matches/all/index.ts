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
