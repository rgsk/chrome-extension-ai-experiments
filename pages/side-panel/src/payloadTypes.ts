export type TabDetails = {
  id: number;
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
    }
  | {
      type: "GET_TAB_INNER_TEXT";
      body: {
        innerText: string;
      };
    }
  | {
      type: "GET_TAB_INNER_HTML";
      body: {
        innerHTML: string;
      };
    };

export type MessageFromIframeToExtensionPayload =
  | {
      type: "PING";
      body: { message: string };
    }
  | {
      type: "GET_TAB_INNER_TEXT";
      body: { tabId: number };
    }
  | {
      type: "GET_TAB_INNER_HTML";
      body: {
        name: string;
      };
    };

export type RequestResponseTypes = Extract<
  MessageFromIframeToExtensionPayload["type"],
  MessageFromExtensionToIframePayload["type"]
>;

export type MessageFromExtensionByType<
  T extends MessageFromExtensionToIframePayload["type"],
> = Extract<MessageFromExtensionToIframePayload, { type: T }>;
