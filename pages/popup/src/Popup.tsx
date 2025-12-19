import { t } from "@extension/i18n";
import {
  PROJECT_URL_OBJECT,
  useStorage,
  withErrorBoundary,
  withSuspense,
} from "@extension/shared";
import { exampleThemeStorage, sharedStorage } from "@extension/storage";
import {
  cn,
  ErrorDisplay,
  LoadingSpinner,
  Switch,
  ToggleButton,
} from "@extension/ui";
import "@src/Popup.css";
import { useEffect, useState } from "react";

const notificationOptions = {
  type: "basic",
  iconUrl: chrome.runtime.getURL("icon-34.png"),
  title: "Injecting content script error",
  message: "You cannot inject script here!",
} as const;

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const { gemini } = useStorage(sharedStorage);
  const logo = isLight
    ? "popup/logo_vertical.svg"
    : "popup/logo_vertical_dark.svg";

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({
      currentWindow: true,
      active: true,
    });

    if (tab) {
      if (tab.url!.startsWith("about:") || tab.url!.startsWith("chrome:")) {
        chrome.notifications.create("inject-error", notificationOptions);
      }

      await chrome.scripting
        .executeScript({
          target: { tabId: tab.id! },
          files: [
            "/content-runtime/example.iife.js",
            "/content-runtime/all.iife.js",
          ],
        })
        .catch((err) => {
          // Handling errors related to other paths
          if (err.message.includes("Cannot access a chrome:// URL")) {
            chrome.notifications.create("inject-error", notificationOptions);
          }
        });
    }
  };

  const [tabOrigin, setTabOrigin] = useState<string>();

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (tab?.url) {
        setTabOrigin(new URL(tab.url).origin);
      }
    });
  }, []);

  return (
    <div className={cn("App", isLight ? "bg-slate-50" : "bg-gray-800")}>
      {tabOrigin === "https://gemini.google.com" ? (
        <>
          <div className="flex flex-col">
            <Switch
              checked={gemini.hideMyStuffRecentsPreview}
              onChange={(checked) => {
                sharedStorage.set((prev) => {
                  return {
                    ...prev,
                    gemini: {
                      ...prev.gemini,
                      hideMyStuffRecentsPreview: checked,
                    },
                  };
                });
              }}
              label="Hide: Recents Preview"
            />
          </div>
        </>
      ) : (
        <header
          className={cn(
            "App-header",
            isLight ? "text-gray-900" : "text-gray-100",
          )}
        >
          <button onClick={goGithubSite}>
            <img
              src={chrome.runtime.getURL(logo)}
              className="App-logo"
              alt="logo"
            />
          </button>
          <p>
            Edit <code>pages/popup/src/Popup.tsx</code>
          </p>
          <button
            className={cn(
              "mt-4 rounded px-4 py-1 font-bold shadow hover:scale-105",
              isLight ? "bg-blue-200 text-black" : "bg-gray-700 text-white",
            )}
            onClick={injectContentScript}
          >
            {t("injectButton")}
          </button>
          <ToggleButton>{t("toggleTheme")}</ToggleButton>
          <button
            onClick={async () => {
              const [tab] = await chrome.tabs.query({
                currentWindow: true,
                active: true,
              });
              if (tab?.id) {
                await chrome.sidePanel.open({ tabId: tab.id });
              }
            }}
          >
            Open Sidepanel
          </button>
        </header>
      )}
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(Popup, <LoadingSpinner />),
  ErrorDisplay,
);
