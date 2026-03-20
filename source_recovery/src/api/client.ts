import { createEdgeSpark } from "@edgespark/client";
import "@edgespark/client/styles.css";

const WORKER_URL = "https://staging--55cdi3nfi9dh4f92yskx.youbase.cloud";

export const client = createEdgeSpark({ baseUrl: WORKER_URL });

export { WORKER_URL };
