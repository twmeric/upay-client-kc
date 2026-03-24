import React, { useState } from "react";

const PRESET_AMOUNTS = [100, 500, 1000, 2000];

const colors = {
  primary: "#FF6B00",
  secondary: "#D4A574",
  background: "#FAF8F5",
  card: "#F5F0EB",
  text: "#1A1A1A",
  textSecondary: "#4A4A4A",
  border: "#E8E4E0"
};

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
    let num = val.replace(/[^0-9.]/g, "");
    const parts = num.split('.');
    if (parts.length > 2) num = parts[0] + '.' + parts.slice(1).join('');
    if (parts.length === 2) {
      parts[1] = parts[1].slice(0, 2);
      num = parts.join('.');
    }
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
      const res = await fetch('/api/payment/create', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          payType,
          subject: "Payment"
        })
      });

      const data = await res.json();

      if (data.success && data.payUrl) {
        window.location.href = data.payUrl;
      } else {
        setError(data.error || "創建訂單失敗");
      }
    } catch (e) {
      setError("網絡錯誤");
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { code: "UP_OP", name: "銀聯在線", icon: "💳" },
    { code: "ALI_H5", name: "支付寶", icon: "🔷" },
    { code: "WX_H5", name: "微信支付", icon: "💬" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: colors.background, padding: "24px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ color: colors.text, margin: "0 0 8px" }}>Payment Gateway</h1>
          <p style={{ color: colors.textSecondary }}>Secure Payment Solution</p>
        </div>

        {/* Amount Selection */}
        <div style={{ 
          background: "white", 
          borderRadius: "16px", 
          padding: "24px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <label style={{ color: colors.textSecondary, fontSize: "14px" }}>選擇金額</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                onClick={() => handlePresetClick(val)}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: "none",
                  background: selectedPreset === val ? colors.primary : colors.card,
                  color: selectedPreset === val ? "white" : colors.text,
                  cursor: "pointer"
                }}
              >
                HK$ {val.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div style={{ marginTop: "16px" }}>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleCustomInput(e.target.value)}
              placeholder="自定義金額 HK$"
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "12px",
                border: `1px solid ${colors.border}`,
                fontSize: "18px"
              }}
            />
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ 
          background: "white", 
          borderRadius: "16px", 
          padding: "24px",
          marginBottom: "16px"
        }}>
          <label style={{ color: colors.textSecondary, fontSize: "14px" }}>支付方式</label>
          <div style={{ marginTop: "12px" }}>
            {paymentMethods.map((method) => (
              <button
                key={method.code}
                onClick={() => setPayType(method.code)}
                style={{
                  width: "100%",
                  padding: "16px",
                  marginBottom: "8px",
                  borderRadius: "12px",
                  border: `2px solid ${payType === method.code ? colors.primary : colors.border}`,
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: "24px" }}>{method.icon}</span>
                <span style={{ color: colors.text, fontWeight: 500 }}>{method.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ 
            padding: "12px", 
            background: "#FFEBEE", 
            color: "#C62828",
            borderRadius: "8px",
            marginBottom: "16px"
          }}>
            {error}
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePay}
          disabled={loading || !amount}
          style={{
            width: "100%",
            padding: "18px",
            borderRadius: "12px",
            border: "none",
            background: colors.primary,
            color: "white",
            fontSize: "18px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "處理中..." : `立即支付 HK$ ${amount || "0"}`}
        </button>
      </div>
    </div>
  );
}
