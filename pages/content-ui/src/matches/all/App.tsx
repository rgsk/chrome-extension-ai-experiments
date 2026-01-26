import { t } from "@extension/i18n";
import { useStorage } from "@extension/shared";
import { ToggleButton } from "@extension/ui";
import { useEffect, useRef } from "react";
import { sharedStorage } from "../../../../../packages/storage/lib";

export default function App() {
  const { gemini } = useStorage(sharedStorage);
  const lastAudioBlockedUrlRef = useRef("");
  useEffect(() => {
    console.log("[CEB] Content ui all loaded");
  }, []);

  useEffect(() => {
    if (window.location.origin === "https://gemini.google.com") {
      const hideRecents = () => {
        const el = document.querySelector(
          "my-stuff-recents-preview",
        ) as HTMLElement;

        if (el) {
          if (gemini.hideMyStuffRecentsPreview) {
            el.style.display = "none";
          } else {
            el.style.display = "";
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
      // ✅ cleanup
      return () => {
        observer.disconnect();
      };
    } else if (window.location.origin === "https://chatgpt.com") {
      document.addEventListener("securitypolicyviolation", (e) => {
        lastAudioBlockedUrlRef.current = e.blockedURI;
        console.log("⚠️ CSP VIOLATION DETECTED:", {
          blockedURI: e.blockedURI,
        });
      });
      (function waitForBubble() {
        const host = document.querySelector("#gdx-bubble-host");
        if (!host) {
          // The extension injects this later — keep waiting
          return requestAnimationFrame(waitForBubble);
        }

        // Shadow root is open, so we can read it directly
        const shadowRoot = host.shadowRoot;
        if (!shadowRoot) {
          return requestAnimationFrame(waitForBubble);
        }

        const root = shadowRoot;
        const attached = new WeakSet<Element>();

        function attachListener() {
          const icon = root.querySelector("#gdx-bubble-audio-icon");
          if (!icon) {
            // Bubble content is dynamic — watch for changes
            return;
          }

          // Avoid double-binding
          if (attached.has(icon)) return;
          attached.add(icon);

          icon.addEventListener("click", (e) => {
            console.log("Audio icon clicked!");
            console.log("Element:", icon);
            const blockedUrl = lastAudioBlockedUrlRef.current;
            if (!blockedUrl) {
              console.warn("No blocked audio URL captured yet.");
              return;
            }

            chrome.runtime.sendMessage({
              type: "play-audio-url",
              url: blockedUrl,
            });
          });

          console.log("Listener attached to #gdx-bubble-audio-icon");
        }

        // Observe shadow DOM updates
        const obs = new MutationObserver(attachListener);
        obs.observe(root, { childList: true, subtree: true });

        // Try attaching right now too
        attachListener();
      })();
    }
  }, [gemini.hideMyStuffRecentsPreview]);
  return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded bg-blue-100 px-2 py-1">
      <div className="flex gap-1 text-sm text-blue-500">
        Edit{" "}
        <strong className="text-blue-700">
          pages/content-ui/src/matches/all/App.tsx
        </strong>{" "}
        and save to reload.
      </div>
      <ToggleButton className={"mt-0"}>{t("toggleTheme")}</ToggleButton>
    </div>
  );
}
