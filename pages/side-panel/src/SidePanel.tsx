import { withErrorBoundary, withSuspense } from "@extension/shared";
import { ErrorDisplay, LoadingSpinner } from "@extension/ui";
import "@src/SidePanel.css";
import { useEffect, useMemo } from "react";
import { v4 } from "uuid";

const port = chrome.runtime.connect({ name: "mySidepanel" });

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab?.id) {
    port.postMessage({ type: "init", tabId: tab.id });
  }
});

const sendResponseToIframe = (payload: unknown) => {
  const iframe = document.querySelector("iframe");

  if (!iframe?.contentWindow) return;

  iframe.contentWindow.postMessage(
    {
      type: "EXTENSION_RESPONSE",
      response: payload,
    },
    "*", // 🔒 exact iframe origin
  );
};
const SidePanel = () => {
  const chatId = useMemo(() => v4(), []);
  useEffect(() => {
    window.addEventListener("message", (event) => {
      // 🔒 SECURITY CHECK
      // if (event.origin !== "http://localhost:5173") return;

      if (event.data?.type === "IFRAME_EVENT") {
        chrome.runtime.sendMessage(
          {
            source: "sidepanel",
            type: "IFRAME_EVENT",
            payload: event.data.payload,
          },
          (response) => {
            sendResponseToIframe(response);
          },
        );
      }
    });
  }, []);

  return (
    <div className="h-screen">
      <iframe
        title="React AI Experiments"
        src={`http://localhost:5173/practice`}
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(SidePanel, <LoadingSpinner />),
  ErrorDisplay,
);
