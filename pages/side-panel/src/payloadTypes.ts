export type TabDetails = {
  url: string;
  title?: string;
  favIconUrl?: string;
};

export type MessageFromExtensionToIframePayload =
  | {
      type: "TAB_URL_CHANGED";
      body: {
        tabDetails: TabDetails;
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
