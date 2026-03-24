/**
 * King-Chicken 后台功能测试脚本
 * 在浏览器控制台(F12)中运行
 */

const API_BASE = 'https://payment-api.jimsbond007.workers.dev';
const TOKEN = 'Bearer admin';

const tests = {
    async testConfigSave() {
        console.log('【测试1】保存配置...');
        try {
            const res = await fetch(`${API_BASE}/api/boss/config`, {
                method: 'POST',
                headers: { 'Authorization': TOKEN, 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: true, time: '21:30', includeTrend: true, includeDetail: true })
            });
            const data = await res.json();
            console.log('结果:', data.success ? '✅ 通过' : '❌ 失败', data);
            return data.success;
        } catch(e) {
            console.error('❌ 错误:', e);
            return false;
        }
    },
    
    async testConfigGet() {
        console.log('【测试2】获取配置...');
        try {
            const res = await fetch(`${API_BASE}/api/boss/config`, {
                headers: { 'Authorization': TOKEN }
            });
            const data = await res.json();
            console.log('配置:', data);
            console.log('时间:', data.time);
            return data.time === '21:30';
        } catch(e) {
            console.error('❌ 错误:', e);
            return false;
        }
    },
    
    async testPayTypeFilter() {
        console.log('【测试3】支付方式筛选...');
        try {
            // 测试微信筛选
            const res = await fetch(`${API_BASE}/api/transactions?page=1&limit=5&payType=${encodeURIComponent('微信')}`, {
                headers: { 'Authorization': TOKEN }
            });
            const data = await res.json();
            console.log('微信筛选结果数量:', data.total);
            const allWX = data.data.every(t => t.payType === 'WX_H5');
            console.log('是否都是微信记录:', allWX ? '✅ 是' : '❌ 否');
            return allWX && data.total === 4;
        } catch(e) {
            console.error('❌ 错误:', e);
            return false;
        }
    },
    
    async testStatusFilter() {
        console.log('【测试4】状态筛选...');
        try {
            const res = await fetch(`${API_BASE}/api/transactions?page=1&limit=5&status=2`, {
                headers: { 'Authorization': TOKEN }
            });
            const data = await res.json();
            console.log('支付成功记录数:', data.total);
            const allSuccess = data.data.every(t => t.status === 2);
            console.log('是否都是成功记录:', allSuccess ? '✅ 是' : '❌ 否');
            return allSuccess;
        } catch(e) {
            console.error('❌ 错误:', e);
            return false;
        }
    },
    
    async testGenerateReport() {
        console.log('【测试5】生成报告...');
        try {
            const res = await fetch(`${API_BASE}/api/boss/reports/generate`, {
                method: 'POST',
                headers: { 'Authorization': TOKEN, 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: '2026-03-21' })
            });
            const data = await res.json();
            console.log('结果:', data.success ? '✅ 通过' : '❌ 失败', data);
            return data.success;
        } catch(e) {
            console.error('❌ 错误:', e);
            return false;
        }
    },
    
    async testReportsList() {
        console.log('【测试6】获取发送记录...');
        try {
            const res = await fetch(`${API_BASE}/api/boss/reports?page=1&limit=10`, {
                headers: { 'Authorization': TOKEN }
            });
            const data = await res.json();
            console.log('记录数量:', data.total);
            console.log('记录:', data.data.map(r => `${r.date}: HK$${r.total_amount/100} ${r.count}笔`));
            return data.total > 0;
        } catch(e) {
            console.error('❌ 错误:', e);
            return false;
        }
    },
    
    async runAll() {
        console.log('========================================');
        console.log('King-Chicken 后台功能自动测试');
        console.log('========================================');
        
        const results = [];
        results.push({ name: '保存配置', pass: await this.testConfigSave() });
        results.push({ name: '获取配置', pass: await this.testConfigGet() });
        results.push({ name: '支付方式筛选', pass: await this.testPayTypeFilter() });
        results.push({ name: '状态筛选', pass: await this.testStatusFilter() });
        results.push({ name: '生成报告', pass: await this.testGenerateReport() });
        results.push({ name: '发送记录', pass: await this.testReportsList() });
        
        console.log('========================================');
        console.log('测试结果汇总:');
        console.log('========================================');
        let passCount = 0;
        results.forEach(r => {
            console.log(`${r.pass ? '✅' : '❌'} ${r.name}`);
            if(r.pass) passCount++;
        });
        console.log(`\n通过率: ${passCount}/${results.length} (${Math.round(passCount/results.length*100)}%)`);
        
        return results;
    }
};

// 自动运行测试
tests.runAll();
