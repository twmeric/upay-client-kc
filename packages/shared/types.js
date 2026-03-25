/**
 * King-Chicken Payment System v2 - 共享類型定義
 * 
 * 這個文件定義了系統中使用的所有數據結構
 */

/**
 * 交易記錄
 * @typedef {Object} Transaction
 * @property {number} id - 數據庫自增 ID
 * @property {string} orderNo - 商家訂單號 (系統生成)
 * @property {string} payOrderId - EasyLink 支付訂單號 (P開頭)
 * @property {number} amount - 金額 (分為單位)
 * @property {string} currency - 貨幣 (HKD)
 * @property {'UP_OP'|'ALI_H5'|'WX_H5'} payType - 支付方式
 * @property {'pending'|'success'|'failed'|'paid'} status - 狀態
 * @property {string} remark - 備註
 * @property {number} createdAt - 創建時間 (Unix timestamp 秒)
 * @property {number} updatedAt - 更新時間 (Unix timestamp 秒)
 */

/**
 * API 響應格式
 * @typedef {Object} ApiResponse
 * @property {boolean} success - 是否成功
 * @property {*} [data] - 數據
 * @property {string} [error] - 錯誤信息
 */

/**
 * 統計數據
 * @typedef {Object} Statistics
 * @property {number} todayRevenue - 今日收入
 * @property {number} todayOrders - 今日訂單數
 * @property {number} successRate - 成功率
 * @property {number} avgResponseTime - 平均處理時間
 */

/**
 * 報告收件人
 * @typedef {Object} ReportRecipient
 * @property {string} name - 名稱
 * @property {string} phone - 電話號碼
 * @property {boolean} enabled - 是否啟用
 */

// 支付方式名稱映射
const PAY_TYPE_NAMES = {
  'UP_OP': '銀聯',
  'ALI_H5': '支付寶',
  'WX_H5': '微信'
};

// 狀態名稱映射
const STATUS_NAMES = {
  'pending': '處理中',
  'success': '成功',
  'failed': '失敗',
  'paid': '已支付'
};

// 導出供其他模塊使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PAY_TYPE_NAMES, STATUS_NAMES };
}
