import { createEdgeSpark } from "@edgespark/client";
import "@edgespark/client/styles.css";

// 修復: 使用正確的 API 地址
const WORKER_URL = "https://payment-api.jimsbond007.workers.dev";

export const client = createEdgeSpark({ baseUrl: WORKER_URL });

export { WORKER_URL };
