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
    if (window.location.origin !== "https://gemini.google.com") return;

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

    return () => {
      observer.disconnect();
    };
  }, [gemini.hideMyStuffRecentsPreview]);

  useEffect(() => {
    if (window.location.origin !== "https://chatgpt.com") return;

    const onCspViolation = (e: SecurityPolicyViolationEvent) => {
      lastAudioBlockedUrlRef.current = e.blockedURI;
      console.log("⚠️ CSP VIOLATION DETECTED:", {
        blockedURI: e.blockedURI,
      });
    };

    document.addEventListener("securitypolicyviolation", onCspViolation);

    const attached = new WeakSet<Element>();
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;

    const waitForBubble = () => {
      const host = document.querySelector("#gdx-bubble-host");
      if (!host) {
        // The extension injects this later — keep waiting
        rafId = requestAnimationFrame(waitForBubble);
        return;
      }

      // Shadow root is open, so we can read it directly
      const shadowRoot = host.shadowRoot;
      if (!shadowRoot) {
        rafId = requestAnimationFrame(waitForBubble);
        return;
      }

      const root = shadowRoot;

      function attachListener() {
        const icon = root.querySelector("#gdx-bubble-audio-icon");
        if (!icon) {
          // Bubble content is dynamic — watch for changes
          return;
        }

        // Avoid double-binding
        if (attached.has(icon)) return;
        attached.add(icon);

        icon.addEventListener("click", () => {
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
      observer = new MutationObserver(attachListener);
      observer.observe(root, { childList: true, subtree: true });

      // Try attaching right now too
      attachListener();
    };

    waitForBubble();

    return () => {
      document.removeEventListener("securitypolicyviolation", onCspViolation);
      if (observer) observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

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
