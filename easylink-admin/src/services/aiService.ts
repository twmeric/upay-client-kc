import type { Message, AnalysisResult, AIAction } from '../types/ai-architect';

// Mock merchant and transaction data for analysis
const mockData = {
  merchants: [
    { id: 'KC001', name: 'King-Chicken', gmv: 380000, transactions: 1240, successRate: 96.5 },
    { id: 'MB002', name: 'Merchant B', gmv: 250000, transactions: 890, successRate: 94.2 },
    { id: 'MC003', name: 'Merchant C', gmv: 45000, transactions: 180, successRate: 91.8 },
  ],
  todayStats: {
    totalAmount: 45230,
    orderCount: 156,
    successCount: 149,
    successRate: 95.5,
  }
};

export class AIService {
  // Context stored for future personalized responses
  // @ts-expect-error - will be used for context-aware responses
  private context: any;

  setContext(context: any) {
    this.context = context;
    console.log('[AI Architect] Context updated:', context);
  }

  async processMessage(userMessage: string, _history: Message[]): Promise<{
    content: string;
    action?: AIAction;
    suggestions?: string[];
  }> {
    const lowerMsg = userMessage.toLowerCase();

    // Navigation commands
    if (lowerMsg.includes('dashboard') || lowerMsg.includes('儀表板') || lowerMsg.includes('總覽')) {
      return {
        content: '正在為你導航到平台總覽頁面...',
        action: { type: 'navigate', page: 'dashboard' },
        suggestions: ['查看交易數據', '查看商戶列表']
      };
    }

    if (lowerMsg.includes('merchant') || lowerMsg.includes('商戶')) {
      return {
        content: '正在打開商戶管理頁面...',
        action: { type: 'navigate', page: 'merchants' },
        suggestions: ['查看 King-Chicken 詳情', '分析商戶表現']
      };
    }

    if (lowerMsg.includes('transaction') || lowerMsg.includes('交易')) {
      return {
        content: '正在導航到交易管理頁面...',
        action: { type: 'navigate', page: 'transactions' },
        suggestions: ['篩選今日交易', '查看異常交易']
      };
    }

    if (lowerMsg.includes('whatsapp') || lowerMsg.includes('報告')) {
      return {
        content: '正在打開 WhatsApp 報告中心...',
        action: { type: 'navigate', page: 'whatsapp' },
        suggestions: ['發送測試報告', '配置報告時間']
      };
    }

    // Analysis commands
    if (lowerMsg.includes('分析') || lowerMsg.includes('analytics') || lowerMsg.includes('趨勢')) {
      const analysis = this.analyzeTrends();
      return {
        content: analysis.summary,
        suggestions: ['查看詳細數據', '導出報告', '設置自動預警']
      };
    }

    if (lowerMsg.includes('今日') || lowerMsg.includes('today')) {
      const stats = mockData.todayStats;
      return {
        content: `📊 **今日交易概況**\n\n` +
          `• 💰 交易總額: HK$ ${stats.totalAmount.toLocaleString()}\n` +
          `• 📦 訂單數量: ${stats.orderCount} 筆\n` +
          `• ✅ 成功交易: ${stats.successCount} 筆\n` +
          `• 📈 成功率: ${stats.successRate}%\n\n` +
          `整體表現良好，成功率超過 95%！`,
        suggestions: ['查看昨日對比', '分析失敗原因', '查看熱門商戶']
      };
    }

    if (lowerMsg.includes('king-chicken') || lowerMsg.includes('咪咪')) {
      const kc = mockData.merchants[0];
      return {
        content: `🏪 **King-Chicken 商戶分析**\n\n` +
          `• 總交易額: HK$ ${kc.gmv.toLocaleString()}\n` +
          `• 總訂單數: ${kc.transactions} 筆\n` +
          `• 成功率: ${kc.successRate}%\n` +
          `• 市場份額: ${((kc.gmv / mockData.merchants.reduce((a, m) => a + m.gmv, 0)) * 100).toFixed(1)}%\n\n` +
          `King-Chicken 是我們的最大商戶，表現非常穩定！`,
        suggestions: ['查看詳細配置', '發送報告給咪咪', '查看交易記錄']
      };
    }

    if (lowerMsg.includes('最佳') || lowerMsg.includes('best') || lowerMsg.includes('表現')) {
      const best = [...mockData.merchants].sort((a, b) => b.gmv - a.gmv)[0];
      return {
        content: `🏆 **表現最佳商戶**\n\n` +
          `**${best.name}**\n` +
          `• 交易額: HK$ ${best.gmv.toLocaleString()}\n` +
          `• 訂單數: ${best.transactions} 筆\n` +
          `• 成功率: ${best.successRate}%\n\n` +
          `這個商戶佔平台總 GMV 的 ${((best.gmv / mockData.merchants.reduce((a, m) => a + m.gmv, 0)) * 100).toFixed(1)}%`,
        suggestions: ['查看其他商戶', '分析成長趨勢', '查看商戶詳情']
      };
    }

    if (lowerMsg.includes('問題') || lowerMsg.includes('異常') || lowerMsg.includes('警告') || lowerMsg.includes('alert')) {
      const failedRate = 100 - mockData.todayStats.successRate;
      return {
        content: failedRate > 5 
          ? `⚠️ **發現異常情況**\n\n今日失敗率為 ${failedRate.toFixed(1)}%，建議檢查:\n• 支付渠道連接\n• 商戶配置設置\n• 網絡連接狀態`
          : `✅ **系統狀態良好**\n\n今日成功率 ${mockData.todayStats.successRate}%，未發現明顯異常。`,
        suggestions: ['查看失敗記錄', '檢查系統日誌', '聯繫技術支援'],
        action: failedRate > 5 ? { type: 'alert', message: '失敗率偏高', level: 'warning' } : undefined
      };
    }

    if (lowerMsg.includes('export') || lowerMsg.includes('導出') || lowerMsg.includes('下載')) {
      return {
        content: '我可以幫你導出數據報告。請選擇格式：',
        suggestions: ['導出 CSV', '導出 PDF', '導出 Excel'],
        action: { type: 'export', format: 'csv' }
      };
    }

    if (lowerMsg.includes('help') || lowerMsg.includes('幫助') || lowerMsg.includes('能做')) {
      return {
        content: `🤖 **EasyLink Architect 功能清單**\n\n` +
          `**導航功能**\n` +
          `• 「打開儀表板」- 查看平台總覽\n` +
          `• 「查看商戶」- 管理商戶列表\n` +
          `• 「查看交易」- 交易記錄管理\n\n` +
          `**分析功能**\n` +
          `• 「今日數據」- 查看今日交易\n` +
          `• 「分析趨勢」- 交易趨勢分析\n` +
          `• 「最佳商戶」- 查看表現最佳\n\n` +
          `**操作功能**\n` +
          `• 「檢查異常」- 系統健康檢查\n` +
          `• 「導出數據」- 生成報告\n\n` +
          `需要我幫你做什麼？`,
        suggestions: ['查看今日數據', '分析商戶表現', '檢查系統狀態']
      };
    }

    // Default response with context awareness
    return {
      content: `我理解你想了解「${userMessage}」。\n\n` +
        `目前我可以幫你：\n` +
        `• 📊 查看今日交易數據\n` +
        `• 🏪 分析商戶表現\n` +
        `• 📱 管理 WhatsApp 報告\n` +
        `• 🔍 導航到各功能頁面\n\n` +
        `輸入「幫助」查看完整功能列表，或直接告訴我你想做什麼。`,
      suggestions: ['查看今日數據', '幫助', '分析趨勢']
    };
  }

  private analyzeTrends(): AnalysisResult {
    const totalGMV = mockData.merchants.reduce((sum, m) => sum + m.gmv, 0);
    const avgSuccessRate = mockData.merchants.reduce((sum, m) => sum + m.successRate, 0) / mockData.merchants.length;
    
    return {
      type: 'trend',
      summary: `📈 **平台整體分析**\n\n` +
        `• 總 GMV: HK$ ${totalGMV.toLocaleString()}\n` +
        `• 活躍商戶: ${mockData.merchants.length} 家\n` +
        `• 平均成功率: ${avgSuccessRate.toFixed(1)}%\n\n` +
        `**觀察**: 平台表現穩定，建議關注成功率較低的商戶以提升整體表現。`,
      details: { totalGMV, merchantCount: mockData.merchants.length, avgSuccessRate },
      recommendations: [
        '聯繫成功率低於 95% 的商戶',
        '檢查支付渠道配置',
        '設置自動預警閾值'
      ]
    };
  }
}

export const aiService = new AIService();
