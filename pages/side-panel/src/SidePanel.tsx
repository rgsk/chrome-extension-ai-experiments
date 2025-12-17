/* eslint-disable @typescript-eslint/no-explicit-any */
import { withErrorBoundary, withSuspense } from "@extension/shared";
import { ErrorDisplay, LoadingSpinner } from "@extension/ui";
import "@src/SidePanel.css";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { v4 } from "uuid";

const iframeOrigin = "http://localhost:5173";

const SidePanel = () => {
  const chatId = useMemo(() => v4(), []);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sendMessageToIframe = useCallback((payload: unknown) => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: "message-to-iframe-from-extension",
          payload: payload,
        },
        iframeOrigin, // 🔒 exact iframe origin
      );
    }
  }, []);

  const onMessageFromIframe = useCallback((payload: unknown) => {
    console.log({ onMessageFromIframe: "onMessageFromIframe", payload });
  }, []);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      // 🔒 SECURITY CHECK
      if (event.origin !== iframeOrigin) return;

      if (event.data?.type === "message-from-iframe-to-extension") {
        const payload = event.data.payload;
        onMessageFromIframe(payload);
      }
    });
  }, [onMessageFromIframe]);

  const onMessageFromServiceWorker = useCallback((payload: any) => {
    console.log({
      onMessageFromServiceWorker: "onMessageFromServiceWorker",
      payload,
    });
    switch (payload.type) {
      case "TAB_ACTIVATED": {
        const { tab } = payload as { tab: chrome.tabs.Tab };
        console.log(tab.url);
        break;
      }
      case "TAB_UPDATED": {
        const { tab } = payload as { tab: chrome.tabs.Tab };
        console.log(tab.url);
        break;
      }
    }
  }, []);

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "message-from-service_worker-to-side_panel") {
        const payload = message.payload;
        onMessageFromServiceWorker(payload);
      }
    });
  }, [onMessageFromServiceWorker]);
  return (
    <div className="h-screen">
      <button
        onClick={() => {
          sendMessageToIframe({ chatId });
        }}
      >
        send
      </button>
      <iframe
        ref={iframeRef}
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
