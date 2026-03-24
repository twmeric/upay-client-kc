import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "../api/client";
import type { Transaction, Merchant, DashboardStats } from "../types/payment";
import { STATUS_MAP, STATUS_COLORS, PAY_TYPES } from "../types/payment";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

// ============ 修复后的 AdminPage ============
// 修复内容:
// 1. 添加 payType filter 支持
// 2. 修复 Boss Config 保存逻辑
// 3. 确保前后端协调工作

export default function AdminPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  // Dashboard
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "transactions" | "boss" | "merchants">("dashboard");

  // Transactions - 修复: 添加 payType filter
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnPage, setTxnPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPayType, setFilterPayType] = useState<string>("all"); // 修复: 添加 payType filter
  const [filterMchNo, setFilterMchNo] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [txnLoading, setTxnLoading] = useState(false);

  // Boss Config - 修复: 完整的状态管理
  const [bossConfig, setBossConfig] = useState({
    enabled: false,
    time: "22:00",
    includeTrend: false,
    includeDetail: false,
    recipients: [] as { phone: string; name: string }[]
  });
  const [bossConfigLoading, setBossConfigLoading] = useState(false);
  const [bossConfigMessage, setBossConfigMessage] = useState("");

  // Merchants
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  // Auth check
  useEffect(() => {
    const check = async () => {
      try {
        const session = await client.auth.getSession();
        if (!session.data?.user) {
          navigate("/login", { replace: true });
          return;
        }
        setUser(session.data.user);
      } catch {
        navigate("/login", { replace: true });
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [navigate]);

  // Load Dashboard Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await client.api.fetch("/api/dashboard/stats");
      const data = await res.json() as { today: DashboardStats["today"]; chart: DashboardStats["chart"] };
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats", e);
    }
  }, []);

  // Load Transactions - 修复: 添加 payType 参数
  const loadTransactions = useCallback(async () => {
    setTxnLoading(true);
    try {
      const params = new URLSearchParams({ page: txnPage.toString(), limit: "15" });
      
      // 修复: 正确传递 status filter
      if (filterStatus !== "all") {
        params.set("status", filterStatus);
      }
      
      // 修复: 正确传递 payType filter
      if (filterPayType !== "all") {
        params.set("payType", filterPayType);
      }
      
      if (filterMchNo) {
        params.set("mchNo", filterMchNo);
      }
      
      if (filterDateFrom) {
        params.set("dateFrom", filterDateFrom);
      }
      
      if (filterDateTo) {
        params.set("dateTo", filterDateTo);
      }

      console.log("[Filter Debug] Request params:", params.toString()); // 调试日志

      const res = await client.api.fetch(`/api/transactions?${params}`);
      const data = await res.json() as { data: Transaction[]; total: number };
      
      console.log("[Filter Debug] Response:", data); // 调试日志
      
      setTransactions(data.data);
      setTxnTotal(data.total);
    } catch (e) {
      console.error("Failed to load transactions", e);
    } finally {
      setTxnLoading(false);
    }
  }, [txnPage, filterStatus, filterPayType, filterMchNo, filterDateFrom, filterDateTo]);

  // Load Boss Config - 修复: 正确的获取和设置
  const loadBossConfig = useCallback(async () => {
    try {
      const res = await client.api.fetch("/api/boss/config");
      const data = await res.json();
      
      console.log("[Boss Config] Loaded:", data); // 调试日志
      
      setBossConfig({
        enabled: data.enabled ?? false,
        time: data.time ?? "22:00",
        includeTrend: data.includeTrend ?? false,
        includeDetail: data.includeDetail ?? false,
        recipients: data.recipients ?? []
      });
    } catch (e) {
      console.error("Failed to load boss config", e);
    }
  }, []);

  // Save Boss Config - 修复: 使用PUT并正确处理响应
  const saveBossConfig = async () => {
    setBossConfigLoading(true);
    setBossConfigMessage("");
    
    try {
      // 修复: 使用PUT方法（后端现在支持）
      const res = await client.api.fetch("/api/boss/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: bossConfig.enabled,
          time: bossConfig.time,
          includeTrend: bossConfig.includeTrend,
          includeDetail: bossConfig.includeDetail,
          recipients: bossConfig.recipients
        })
      });

      const data = await res.json();
      console.log("[Boss Config] Save response:", data); // 调试日志

      if (res.ok && data.success) {
        setBossConfigMessage("✓ 配置保存成功");
        // 修复: 重新加载配置以验证持久化
        await loadBossConfig();
      } else {
        setBossConfigMessage(`✗ 保存失败: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error("Failed to save boss config", e);
      setBossConfigMessage("✗ 保存失败，请检查网络");
    } finally {
      setBossConfigLoading(false);
    }
  };

  // Load Merchants
  const loadMerchants = useCallback(async () => {
    try {
      const res = await client.api.fetch("/api/merchants");
      const data = await res.json() as { data: Merchant[] };
      setMerchants(data.data);
    } catch (e) {
      console.error("Failed to load merchants", e);
    }
  }, []);

  // Tab切换时加载数据
  useEffect(() => {
    if (checking || !user) return;
    if (activeTab === "dashboard") loadStats();
    if (activeTab === "transactions") loadTransactions();
    if (activeTab === "boss") loadBossConfig();
    if (activeTab === "merchants") loadMerchants();
  }, [checking, user, activeTab, loadStats, loadTransactions, loadBossConfig, loadMerchants]);

  // Filter变化时重置页码并重新加载
  useEffect(() => {
    setTxnPage(1);
    if (activeTab === "transactions" && !checking) {
      loadTransactions();
    }
  }, [filterStatus, filterPayType, filterMchNo, filterDateFrom, filterDateTo]);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);
    if (filterMchNo) params.set("mchNo", filterMchNo);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterPayType !== "all") params.set("payType", filterPayType);
    
    try {
      const res = await client.api.fetch(`/api/transactions/export?${params}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reconciliation_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("下載失敗");
    }
  };

  const handleLogout = async () => {
    await client.auth.signOut();
    navigate("/login", { replace: true });
  };

  // 添加收件人
  const addRecipient = () => {
    setBossConfig(prev => ({
      ...prev,
      recipients: [...prev.recipients, { phone: "", name: "" }]
    }));
  };

  // 更新收件人
  const updateRecipient = (index: number, field: "phone" | "name", value: string) => {
    setBossConfig(prev => ({
      ...prev,
      recipients: prev.recipients.map((r, i) => 
        i === index ? { ...r, [field]: value } : r
      )
    }));
  };

  // 删除收件人
  const removeRecipient = (index: number) => {
    setBossConfig(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  const totalPages = Math.ceil(txnTotal / 15);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              K
            </div>
            <h1 className="text-lg font-bold text-gray-900">勁達路盟管理後台</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.name || user?.email}</span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">登出</button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-lg">
          {([
            { key: "dashboard", label: "儀表板" },
            { key: "transactions", label: "交易流水" },
            { key: "boss", label: "老闆摯愛" },
            { key: "merchants", label: "商戶管理" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ═══════════ DASHBOARD ═══════════ */}
        {activeTab === "dashboard" && stats && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">今日交易總額</div>
                <div className="text-3xl font-bold text-gray-900">
                  HK$ {(stats.today.totalAmount / 100).toLocaleString()}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">今日訂單量</div>
                <div className="text-3xl font-bold text-gray-900">{stats.today.orderCount}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">今日成功交易</div>
                <div className="text-3xl font-bold text-green-600">{stats.today.successCount}</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-base font-semibold text-gray-900 mb-4">近7天交易總額 (HKD)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chart.map(d => ({ ...d, amountHKD: d.amount / 100 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => [`HK$ ${v.toLocaleString()}`, "交易額"]} />
                      <Bar dataKey="amountHKD" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-base font-semibold text-gray-900 mb-4">近7天訂單量</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.chart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" name="總訂單" stroke="#4F46E5" strokeWidth={2} />
                      <Line type="monotone" dataKey="successCount" name="成功" stroke="#16A34A" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ TRANSACTIONS ═══════════ */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            {/* Filters - 修复: 添加支付方式筛选 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex flex-wrap gap-3 items-end">
                {/* 状态筛选 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">狀態</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  >
                    <option value="all">全部</option>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* 修复: 添加支付方式筛选 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">支付方式</label>
                  <select
                    value={filterPayType}
                    onChange={(e) => setFilterPayType(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  >
                    <option value="all">全部</option>
                    {PAY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">商戶號</label>
                  <input
                    value={filterMchNo}
                    onChange={(e) => setFilterMchNo(e.target.value)}
                    placeholder="U17..."
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-36 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">開始日期</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">結束日期</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  />
                </div>

                <button
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterPayType("all");
                    setFilterMchNo("");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                    setTxnPage(1);
                  }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  重置
                </button>

                <button
                  onClick={handleExport}
                  className="ml-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                >
                  下載對賬單
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">訂單號</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">商戶號</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">金額 (HKD)</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">支付方式</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">狀態</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">建立時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txnLoading ? (
                      <tr><td colSpan={6} className="text-center py-12 text-gray-400">載入中...</td></tr>
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12 text-gray-400">暫無交易記錄</td></tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">{t.orderNo}</td>
                          <td className="px-4 py-3 text-gray-600">{t.mchNo}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {(t.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {PAY_TYPES.find(pt => pt.value === t.payType)?.label || t.payType || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || "bg-gray-100 text-gray-700"}`}>
                              {STATUS_MAP[t.status] || "未知"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(t.createdAt * 1000).toLocaleString("zh-HK")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">共 {txnTotal} 筆記錄</span>
                  <div className="flex gap-2">
                    <button
                      disabled={txnPage <= 1}
                      onClick={() => setTxnPage(p => p - 1)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      上一頁
                    </button>
                    <span className="px-3 py-1.5 text-sm text-gray-600">
                      {txnPage} / {totalPages}
                    </span>
                    <button
                      disabled={txnPage >= totalPages}
                      onClick={() => setTxnPage(p => p + 1)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      下一頁
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ BOSS CONFIG ═══════════ */}
        {activeTab === "boss" && (
          <div className="space-y-6">
            {/* 配置卡片 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">老闆日報配置</h2>
              
              {bossConfigMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  bossConfigMessage.startsWith("✓") 
                    ? "bg-green-50 text-green-700" 
                    : "bg-red-50 text-red-700"
                }`}>
                  {bossConfigMessage}
                </div>
              )}

              {/* 收件人列表 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">收件人列表</label>
                <div className="space-y-3">
                  {bossConfig.recipients.map((recipient, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="名稱 (可選)"
                        value={recipient.name}
                        onChange={(e) => updateRecipient(index, "name", e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="電話號碼 (如: 85291234567)"
                        value={recipient.phone}
                        onChange={(e) => updateRecipient(index, "phone", e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                      />
                      <button
                        onClick={() => removeRecipient(index)}
                        className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        刪除
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addRecipient}
                  className="mt-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  + 添加收件人
                </button>
              </div>

              {/* 發送時間 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">每日發送時間</label>
                <input
                  type="time"
                  value={bossConfig.time}
                  onChange={(e) => setBossConfig(prev => ({ ...prev, time: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                />
              </div>

              {/* 選項 */}
              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bossConfig.enabled}
                    onChange={(e) => setBossConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">啟用自動發送</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bossConfig.includeTrend}
                    onChange={(e) => setBossConfig(prev => ({ ...prev, includeTrend: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">包含本週對比趨勢</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bossConfig.includeDetail}
                    onChange={(e) => setBossConfig(prev => ({ ...prev, includeDetail: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">包含支付方式明細</span>
                </label>
              </div>

              {/* 保存按钮 */}
              <button
                onClick={saveBossConfig}
                disabled={bossConfigLoading}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50"
              >
                {bossConfigLoading ? "保存中..." : "保存配置"}
              </button>

              {/* 當前狀態 */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  當前狀態: 
                  <span className={`ml-2 font-medium ${bossConfig.enabled ? "text-green-600" : "text-gray-500"}`}>
                    {bossConfig.enabled ? "✓ 已啟用" : "○ 已停用"}
                  </span>
                  {bossConfig.enabled && (
                    <span className="ml-2">
                      - 將於每日 {bossConfig.time} 發送到 {bossConfig.recipients.length} 位收件人
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ MERCHANTS ═══════════ */}
        {activeTab === "merchants" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">商戶號</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">名稱</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">啟用</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">可結算</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merchants.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-12 text-gray-400">暫無商戶</td></tr>
                    ) : (
                      merchants.map((m) => (
                        <tr key={m.id} className="border-b border-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">{m.mchNo}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {m.isActive ? "啟用" : "停用"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${m.canSettle ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                              {m.canSettle ? "可結算" : "不可"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
