export type MessageFromExtensionToIframePayload =
  | {
      type: "TAB_URL_CHANGED";
      body: {
        tabDetails: {
          url: string;
          favIconUrl?: string;
        };
      };
    }
  | {
      type: "PONG";
      body: {
        messageResponseByExtension: string;
        messageReceivedByExtension: string;
      };
    };

export type MessageFromIframeToExtensionPayload = {
  type: "PING";
  body: { message: string };
};
