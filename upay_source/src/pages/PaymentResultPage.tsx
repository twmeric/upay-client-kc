import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { client } from "../api/client";
import { STATUS_MAP } from "../types/payment";

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderNo = params.get("orderNo");
  const [status, setStatus] = useState<number | null>(null);
  const [txn, setTxn] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNo) return;
    const poll = async () => {
      try {
        const res = await client.api.fetch(`/api/public/payment/query/${orderNo}`);
        const data = await res.json() as any;
        setStatus(data.status);
        setTxn(data);
        if (data.status === 1) {
          setTimeout(poll, 3000);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    poll();
  }, [orderNo]);

  const isSuccess = status === 2;
  const isPending = status === 1;
  const isFailed = status === 3 || status === 4 || status === 6;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 max-w-md w-full text-center">
        {loading ? (
          <div className="py-12">
            <svg className="w-12 h-12 animate-spin text-blue-600 mx-auto" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-4 text-gray-500">查詢訂單狀態...</p>
          </div>
        ) : (
          <>
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              isSuccess ? "bg-green-100" : isPending ? "bg-yellow-100" : "bg-red-100"
            }`}>
              {isSuccess ? (
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : isPending ? (
                <svg className="w-10 h-10 text-yellow-600 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            <h1 className={`text-2xl font-bold mb-2 ${
              isSuccess ? "text-green-700" : isPending ? "text-yellow-700" : "text-red-700"
            }`}>
              {isSuccess ? "支付成功" : isPending ? "等待支付" : "支付失敗"}
            </h1>

            <p className="text-gray-500 mb-6">
              {STATUS_MAP[status ?? 0] || "未知狀態"}
            </p>

            {txn && (
              <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">訂單號</span>
                  <span className="text-gray-900 text-sm font-mono">{txn.orderNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">金額</span>
                  <span className="text-gray-900 font-bold">HK$ {(txn.amount / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">支付方式</span>
                  <span className="text-gray-900 text-sm">{txn.payType || "-"}</span>
                </div>
              </div>
            )}

            <a
              href="/"
              className="inline-block w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200"
            >
              返回首頁
            </a>
          </>
        )}
      </div>
    </div>
  );
}
