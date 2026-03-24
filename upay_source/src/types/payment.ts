export interface Transaction {
  id: number;
  orderNo: string;
  mchOrderNo: string | null;
  mchNo: string;
  amount: number;
  currency: string;
  payType: string | null;
  subject: string | null;
  body: string | null;
  status: number;
  payerInfo: string | null;
  notifyUrl: string | null;
  returnUrl: string | null;
  rawResponse: string | null;
  createdAt: number;
  updatedAt: number;
  paidAt: number | null;
  customerIp: string | null;
}

export interface Merchant {
  id: number;
  mchNo: string;
  name: string;
  isActive: number;
  canSettle: number;
  settlementRate: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface DashboardStats {
  today: {
    totalAmount: number;
    orderCount: number;
    successCount: number;
  };
  chart: Array<{
    date: string;
    amount: number;
    count: number;
    successCount: number;
  }>;
}

export const STATUS_MAP: Record<number, string> = {
  0: "訂單生成",
  1: "支付中",
  2: "支付成功",
  3: "支付失敗",
  4: "已撤銷",
  5: "已退款",
  6: "訂單關閉",
};

export const STATUS_COLORS: Record<number, string> = {
  0: "bg-gray-100 text-gray-700",
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-green-100 text-green-700",
  3: "bg-red-100 text-red-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-purple-100 text-purple-700",
  6: "bg-gray-100 text-gray-500",
};

export const PAY_TYPES = [
  { value: "UP_OP", label: "銀聯" },
  { value: "ALI_H5", label: "支付寶" },
  { value: "WX_H5", label: "微信支付" },
];
