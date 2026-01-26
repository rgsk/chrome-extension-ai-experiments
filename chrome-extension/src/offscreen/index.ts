console.log("[Offscreen] Loaded");

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "offscreen-play") return;
  const url = message.url;
  if (!url || typeof url !== "string") return;

  console.log("[Offscreen] Playing audio:", url);
  fetch(url, { credentials: "include" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          "Failed to fetch audio: " +
            response.status +
            " " +
            response.statusText,
        );
      }
      return response.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audio.addEventListener(
        "ended",
        () => {
          URL.revokeObjectURL(objectUrl);
        },
        { once: true },
      );
      return audio.play();
    })
    .catch((error) => {
      console.error("Offscreen audio playback failed:", error);
    });
});
