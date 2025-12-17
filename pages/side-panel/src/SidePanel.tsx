import { withErrorBoundary, withSuspense } from "@extension/shared";
import { ErrorDisplay, LoadingSpinner } from "@extension/ui";
import type {
  MessageFromExtensionToIframePayload,
  MessageFromIframeToExtensionPayload,
  TabDetails,
} from "@src/payloadTypes";
import "@src/SidePanel.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 } from "uuid";
import { REACT_EXPERIMENTS_URL } from "../../../packages/env/lib";

const iframeOrigin = REACT_EXPERIMENTS_URL;

const getInnerTextForTab = async (tabId: number) => {
  const result = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => document.body.innerText,
  });
  const innerText = result[0]?.result ?? "";
  return innerText;
};

const getTabDetails = (tab: chrome.tabs.Tab) => {
  if (tab.url && tab.id) {
    const tabDetails: TabDetails = {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
    };
    return tabDetails;
  }
  return null;
};

const SidePanel = () => {
  const chatId = useMemo(() => v4(), []);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeState, setIframeState] = useState<{
    connectionActive: boolean;
  }>({ connectionActive: false });
  const sendMessageToIframe = useCallback(
    (
      payload: MessageFromExtensionToIframePayload,
      requestResponseId?: string,
    ) => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "message-to-iframe-from-extension",
            requestResponseId,
            payload: payload,
          },
          iframeOrigin ?? "*", // 🔒 exact iframe origin
        );
      }
    },
    [],
  );

  const onMessageFromIframe = useCallback(
    async (
      payload: MessageFromIframeToExtensionPayload,
      requestResponseId?: string,
    ) => {
      switch (payload.type) {
        case "PING": {
          const { message } = payload.body;
          setIframeState((prev) => ({ ...prev, connectionActive: true }));
          sendMessageToIframe({
            type: "PONG",
            body: {
              messageResponseByExtension: "pong",
              messageReceivedByExtension: message,
            },
          });
          break;
        }
        case "GET_TAB_INNER_TEXT": {
          const { tabId } = payload.body;
          const innerText = await getInnerTextForTab(tabId);
          sendMessageToIframe(
            {
              type: "GET_TAB_INNER_TEXT",
              body: {
                innerText,
              },
            },
            requestResponseId,
          );
          break;
        }
      }
    },
    [sendMessageToIframe],
  );

  useEffect(() => {
    window.addEventListener("message", (event) => {
      // 🔒 SECURITY CHECK
      if (event.origin !== iframeOrigin) return;

      if (event.data?.type === "message-from-iframe-to-extension") {
        const payload = event.data.payload;
        const requestResponseId = event.data.requestResponseId;
        onMessageFromIframe(payload, requestResponseId);
      }
    });
  }, [onMessageFromIframe]);

  useEffect(() => {
    if (iframeState.connectionActive) {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        async ([tab]) => {
          if (tab) {
            const tabDetails = getTabDetails(tab);
            if (tabDetails) {
              sendMessageToIframe({
                type: "TAB_URL_CHANGED",
                body: {
                  tabDetails,
                },
              });
            }
          }
        },
      );
      chrome.tabs.onActivated.addListener(async (activeInfo) => {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        const tabDetails = getTabDetails(tab);
        if (tabDetails) {
          sendMessageToIframe({
            type: "TAB_URL_CHANGED",
            body: {
              tabDetails,
            },
          });
        }
      });

      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        const tabDetails = getTabDetails(tab);
        if (tabDetails) {
          sendMessageToIframe({
            type: "TAB_URL_CHANGED",
            body: {
              tabDetails,
            },
          });
        }
      });
    }
  }, [iframeState.connectionActive, sendMessageToIframe]);

  return (
    <div className="h-screen">
      <button
        onClick={() => {
          // @ts-ignore
          chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
            // dataUrl is a base64 image
            console.log(dataUrl);
          });
        }}
      >
        press me
      </button>
      <iframe
        ref={iframeRef}
        title="React AI Experiments"
        src={`${REACT_EXPERIMENTS_URL}/chat/${chatId}`}
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(SidePanel, <LoadingSpinner />),
  ErrorDisplay,
);
