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
  return new Promise((resolve) => {
    audio.addEventListener(
      "ended",
      () => {
        cleanupCurrentAudio();
        resolve(undefined);
      },
      { once: true },
    );
  });
};

function arraysEqual(arr1: Uint8Array, arr2: Uint8Array): boolean {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}
function stringToUint8Array(value: string) {
  return new TextEncoder().encode(value);
}
const endOfStreamUint8Array = stringToUint8Array("endOfStream");

const playStreamingResponse = async (
  reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>,
) => {
  let currentMediaSource = null as MediaSource | null;
  const audioQueue: Uint8Array[] = [];
  const appendNextBuffer = (sourceBuffer: SourceBuffer) => {
    if (audioQueue.length > 0 && !sourceBuffer.updating) {
      const nextChunk = audioQueue.shift();
      if (nextChunk) {
        if (arraysEqual(endOfStreamUint8Array, nextChunk)) {
          if (currentMediaSource) {
            currentMediaSource.endOfStream();
          }
        } else {
          sourceBuffer.appendBuffer(nextChunk as any);
        }
      }
    }
  };

  currentMediaSource = new MediaSource();
  currentMediaSource.addEventListener("sourceopen", () => {
    const sourceBuffer = currentMediaSource.addSourceBuffer("audio/mpeg");
    sourceBuffer.addEventListener("updateend", () => {
      appendNextBuffer(sourceBuffer);
    });
    const processAudioChunk = (chunk: Uint8Array) => {
      if (sourceBuffer.updating) {
        audioQueue.push(chunk);
      } else {
        audioQueue.push(chunk);
        appendNextBuffer(sourceBuffer);
      }
    };
    const readStream = () => {
      reader.read().then(({ done, value }) => {
        if (done) {
          processAudioChunk(endOfStreamUint8Array);
          return;
        }

        processAudioChunk(value);
        readStream();
      });
    };

    readStream();
  });
  const objectUrl = URL.createObjectURL(currentMediaSource);
  currentObjectUrl = objectUrl;
  const audio = new Audio(objectUrl);
  currentAudio = audio;

  await audio.play();
  return new Promise((resolve) => {
    audio.addEventListener(
      "ended",
      () => {
        cleanupCurrentAudio();
        resolve(undefined);
      },
      { once: true },
    );
  });
};

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "offscreen-play") {
    cleanupCurrentAudio();
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
        return response.blob().then((blob) => playBlob(blob));
      })
      .catch((error) => {
        console.error("Offscreen audio playback failed:", error);
      });
  } else if (message.type === "offscreen-tts") {
    cleanupCurrentAudio();
    const text = message.text;
    const voice = message.voice;
    if (!text || typeof text !== "string") return;

    const controller = new AbortController();
    currentAbort = controller;

    fetch("http://localhost:8778/experiments/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to fetch audio: " +
              response.status +
              " " +
              response.statusText,
          );
        }
        const reader = response.body!.getReader();
        return playStreamingResponse(reader);
      })
      .catch((error) => {
        console.error("Offscreen audio playback failed:", error);
      });
  } else if (message.type === "offscreen-tts-stop") {
    console.log("[Offscreen] Stopping TTS playback.");
    cleanupCurrentAudio();
  }
});
