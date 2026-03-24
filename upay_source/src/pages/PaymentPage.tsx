import React, { useState } from "react";
import { client } from "../api/client";
import { PAY_TYPES } from "../types/payment";

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000];

export default function PaymentPage() {
  const [amount, setAmount] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [payType, setPayType] = useState("UP_OP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePresetClick = (val: number) => {
    setSelectedPreset(val);
    setAmount(val.toString());
  };

  const handleCustomInput = (val: string) => {
    const num = val.replace(/[^0-9.]/g, "");
    setAmount(num);
    setSelectedPreset(null);
  };

  const handlePay = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("請輸入有效金額");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await client.api.fetch("/api/public/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          payType,
          subject: "Payment",
          body: "Payment",
        }),
      });

      const data = await res.json() as any;

      if (data.success && data.payUrl) {
        // payUrl from payData field - redirect to payment page
        window.location.href = data.payUrl;
      } else if (data.success && data.data?.payData) {
        // fallback: try payData directly
        window.location.href = data.data.payData;
      } else {
        setError(data.error || "建立訂單失敗，請稍後再試");
      }
    } catch (e: any) {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">線上收款</h1>
          <p className="text-gray-500 mt-1">選擇金額並完成付款</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
          {/* Preset Amounts */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">快速選擇金額</label>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  onClick={() => handlePresetClick(val)}
                  className={`py-4 rounded-2xl text-lg font-bold transition-all duration-200 ${
                    selectedPreset === val
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200 scale-[1.02]"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  HK$ {val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-400">或</span>
            </div>
          </div>

          {/* Custom Amount */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">自定義金額 (HKD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-semibold">HK$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleCustomInput(e.target.value)}
                placeholder="0.00"
                className="w-full pl-16 pr-4 py-4 text-2xl font-bold border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">支付方式</label>
            <select
              value={payType}
              onChange={(e) => setPayType(e.target.value)}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-gray-700 bg-white"
            >
              {PAY_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handlePay}
            disabled={loading || !amount}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                處理中...
              </span>
            ) : (
              `立即支付 HK$ ${parseFloat(amount || "0").toLocaleString()}`
            )}
          </button>
        </div>

        {/* Admin link */}
        <div className="text-center mt-6">
          <a href="/admin" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
            管理後台 →
          </a>
        </div>
      </div>
    </div>
  );
}
