import { FASTIFY_SERVER_URL } from "@extension/env";

console.log("[Offscreen] Loaded");

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let currentAbort: AbortController | null = null;

const cleanupCurrentAudio = () => {
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
};

const playBlob = async (blob: Blob) => {
  cleanupCurrentAudio();
  const objectUrl = URL.createObjectURL(blob);
  currentObjectUrl = objectUrl;
  const audio = new Audio(objectUrl);
  currentAudio = audio;
  audio.addEventListener(
    "ended",
    () => {
      cleanupCurrentAudio();
    },
    { once: true },
  );
  await audio.play();
};

const playStreamingResponse = async (response: Response) => {
  if (!response.body) {
    const blob = await response.blob();
    await playBlob(blob);
    return;
  }

  cleanupCurrentAudio();
  const mediaSource = new MediaSource();
  const objectUrl = URL.createObjectURL(mediaSource);
  currentObjectUrl = objectUrl;
  const audio = new Audio(objectUrl);
  currentAudio = audio;

  const streamDone = new Promise<void>((resolve, reject) => {
    const handleError = () => {
      mediaSource.removeEventListener("error", handleError);
      reject(new Error("MediaSource error"));
    };
    mediaSource.addEventListener("error", handleError, { once: true });

    mediaSource.addEventListener(
      "sourceopen",
      async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
          const reader = response.body!.getReader();

          const appendBuffer = (chunk: ArrayBuffer) =>
            new Promise<void>((resolveAppend, rejectAppend) => {
              const onError = () => {
                cleanup();
                rejectAppend(new Error("Failed to append audio buffer"));
              };
              const onUpdateEnd = () => {
                cleanup();
                resolveAppend();
              };
              const cleanup = () => {
                sourceBuffer.removeEventListener("error", onError);
                sourceBuffer.removeEventListener("updateend", onUpdateEnd);
              };
              sourceBuffer.addEventListener("error", onError);
              sourceBuffer.addEventListener("updateend", onUpdateEnd);
              sourceBuffer.appendBuffer(chunk);
            });

          await audio.play();

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && value.length) {
              if (sourceBuffer.updating) {
                await new Promise<void>((resolveUpdate) => {
                  const onUpdateEnd = () => {
                    sourceBuffer.removeEventListener("updateend", onUpdateEnd);
                    resolveUpdate();
                  };
                  sourceBuffer.addEventListener("updateend", onUpdateEnd);
                });
              }
              const arrayBuffer = new Uint8Array(value).buffer;
              await appendBuffer(arrayBuffer);
            }
          }

          if (mediaSource.readyState === "open") {
            mediaSource.endOfStream();
          }
          resolve();
        } catch (streamError) {
          if (mediaSource.readyState === "open") {
            mediaSource.endOfStream("network");
          }
          reject(streamError);
        }
      },
      { once: true },
    );
  });

  audio.addEventListener(
    "ended",
    () => {
      cleanupCurrentAudio();
    },
    { once: true },
  );

  await streamDone;
};

const USE_STREAMING_PLAYBACK = false;

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "offscreen-play") {
    const url = message.url;
    if (!url || typeof url !== "string") return;

    console.log("[Offscreen] Playing audio:", url);
    const controller = new AbortController();
    currentAbort = controller;
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to fetch audio: " +
              response.status +
              " " +
              response.statusText,
          );
        }
        if (USE_STREAMING_PLAYBACK) {
          return playStreamingResponse(response);
        }
        return response.blob().then((blob) => playBlob(blob));
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.error("Offscreen audio playback failed:", error);
        }
      })
      .finally(() => {
        if (currentAbort === controller) currentAbort = null;
      });
    return;
  }

  if (message.type === "offscreen-tts") {
    const text = message.text;
    const voice = message.voice;
    if (!text || typeof text !== "string") return;

    console.log("[Offscreen] Fetching TTS for text length:", text.length);
    const controller = new AbortController();
    currentAbort = controller;
    fetch(`${FASTIFY_SERVER_URL}/experiments/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), voice: voice || undefined }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "TTS request failed: " +
              response.status +
              " " +
              response.statusText,
          );
        }
        if (USE_STREAMING_PLAYBACK) {
          return playStreamingResponse(response);
        }
        return response.blob().then((blob) => playBlob(blob));
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.error("Offscreen TTS playback failed:", error);
        }
      })
      .finally(() => {
        if (currentAbort === controller) currentAbort = null;
      });
    return;
  }

  if (message.type === "offscreen-tts-stop") {
    console.log("[Offscreen] Stopping TTS playback.");
    cleanupCurrentAudio();
  }
});
