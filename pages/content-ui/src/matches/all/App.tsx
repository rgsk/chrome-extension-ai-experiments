import { useStorage } from "@extension/shared";
import { useEffect } from "react";
import { sharedStorage } from "../../../../../packages/storage/lib";
import CsesProblemset, { isCsesProblemsetPage } from "./CsesProblemset";

export default function App() {
  const { leetcode, blockedAudio } = useStorage(sharedStorage);
  useEffect(() => {
    console.log("[CEB] Content ui all loaded");
  }, []);

  useEffect(() => {
    if (window.location.origin !== "https://leetcode.com") return;

    // svg.fa-lock matches the class token exactly, so the fa-lock-keyhole
    // icon in each row's frequency bar is not matched
    const style = document.createElement("style");
    style.textContent = `
      html.ceb-hide-locked a[href^="/problems/"]:has(svg.fa-lock, [data-icon="lock"]) {
        display: none !important;
      }
    `;
    document.head.append(style);

    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (window.location.origin !== "https://leetcode.com") return;

    // LeetCode navigates client-side, so re-check the path after each navigation
    const update = () => {
      document.documentElement.classList.toggle(
        "ceb-hide-locked",
        leetcode.hideLockedLinks &&
          window.location.pathname.startsWith("/problemset"),
      );
    };

    // Navigation API (Chrome 102+); not in this TypeScript version's DOM types
    const navigation = (window as Window & { navigation?: EventTarget })
      .navigation;

    update();
    navigation?.addEventListener("navigatesuccess", update);

    return () => {
      navigation?.removeEventListener("navigatesuccess", update);
    };
  }, [leetcode.hideLockedLinks]);

  useEffect(() => {
    // these sites' CSP blocks the bubble's audio, so it's played from the background instead
    if (
      !["https://chatgpt.com", "https://claude.ai"].includes(
        window.location.origin,
      )
    )
      return;
    if (!blockedAudio.playFromBackground) return;

    // removes every listener added below when the setting is turned off
    const abortController = new AbortController();
    const { signal } = abortController;
    let lastBlockedAudioUrl = "";

    document.addEventListener(
      "securitypolicyviolation",
      (e) => {
        if (e.effectiveDirective !== "media-src") return;
        lastBlockedAudioUrl = e.blockedURI;
        console.log("[CEB] blocked audio url", e.blockedURI);
      },
      { signal },
    );

    // The bubble's shadow root is open, so composedPath() reaches into it;
    // capture phase so it fires even if the bubble stops propagation
    document.addEventListener(
      "click",
      (e) => {
        const isAudioIcon = e
          .composedPath()
          .some(
            (target) =>
              target instanceof Element &&
              target.id === "gdx-bubble-audio-icon",
          );
        if (!isAudioIcon) return;

        if (!lastBlockedAudioUrl) {
          console.warn("[CEB] no blocked audio url captured yet");
          return;
        }

        chrome.runtime.sendMessage({
          type: "play-audio-url",
          url: lastBlockedAudioUrl,
        });
      },
      { capture: true, signal },
    );

    return () => {
      abortController.abort();
    };
  }, [blockedAudio.playFromBackground]);

  return isCsesProblemsetPage() ? <CsesProblemset /> : null;
}
