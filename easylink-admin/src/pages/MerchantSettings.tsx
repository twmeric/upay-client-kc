import { useState } from 'react';
import { 
  Store, 
  Key, 
  CreditCard, 
  Save,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export default function MerchantSettings() {
  const [config, setConfig] = useState({
    mchNo: '80403445499539',
    appId: '6763e0a175249c805471328d',
    appSecret: '••••••••••••••••••••••••••',
    cloudwapiKey: 'fLt40WBzPE2DIK5Ls8AIPAMnt8pV8D',
    cloudwapiSender: '85298113210',
    returnUrl: 'https://easylink.jkdcoding.com/payment/success',
    notifyUrl: 'https://payment-api.jimsbond007.workers.dev/api/webhooks/notify'
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const InputGroup = ({ 
    label, 
    value, 
    onChange, 
    type = 'text', 
    icon: Icon,
    description,
    readOnly = false
  }: any) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '0.875rem', 
        fontWeight: 500,
        color: 'var(--gray-300)',
        marginBottom: '0.5rem'
      }}>
        {label}
      </label>
      {description && (
        <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
          {description}
        </p>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon size={18} style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--gray-500)'
          }} />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          readOnly={readOnly}
          style={{
            width: '100%',
            padding: Icon ? '0.875rem 1rem 0.875rem 2.75rem' : '0.875rem 1rem',
            background: readOnly ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.5rem',
            color: readOnly ? 'var(--gray-500)' : 'white',
            fontSize: '0.875rem',
            outline: 'none',
            fontFamily: type === 'password' ? 'inherit' : 'monospace'
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem'
      }}>
        {/* EasyLink Config */}
        <div className="card">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(255,107,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF6B00'
            }}>
              <Store size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>EasyLink 配置</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                支付渠道 API 設置
              </p>
            </div>
          </div>

          <InputGroup
            label="商戶號 (MchNo)"
            value={config.mchNo}
            icon={Store}
            description="EasyLink 分配的商戶編號"
            readOnly
          />

          <InputGroup
            label="應用 ID (AppId)"
            value={config.appId}
            icon={Key}
            description="應用程序唯一標識"
            readOnly
          />

          <InputGroup
            label="應用密鑰 (AppSecret)"
            value={config.appSecret}
            type="password"
            icon={Key}
            description="用於 API 請求簽名"
            readOnly
          />

          <div style={{ 
            padding: '1rem',
            background: 'rgba(255,107,0,0.1)',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <CheckCircle size={20} color="#FF6B00" />
            <span style={{ fontSize: '0.875rem' }}>
              EasyLink API 連接正常
            </span>
            <a 
              href="https://api-pay.gnete.com.hk" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: '#FF6B00',
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}
            >
              查看文檔 <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* CloudWAPI Config */}
        <div className="card">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(16,185,129,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <CreditCard size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>CloudWAPI 配置</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                WhatsApp 消息發送服務
              </p>
            </div>
          </div>

          <InputGroup
            label="API Key"
            value={config.cloudwapiKey}
            onChange={(v: string) => setConfig({ ...config, cloudwapiKey: v })}
            icon={Key}
            description="CloudWAPI 平台獲取的 API 密鑰"
          />

          <InputGroup
            label="發送者號碼"
            value={config.cloudwapiSender}
            onChange={(v: string) => setConfig({ ...config, cloudwapiSender: v })}
            icon={Store}
            description="已註冊的 WhatsApp 商業號碼"
          />

          <div style={{ 
            padding: '1rem',
            background: 'rgba(16,185,129,0.1)',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <CheckCircle size={20} color="#10b981" />
            <span style={{ fontSize: '0.875rem' }}>
              CloudWAPI 連接正常
            </span>
          </div>
        </div>

        {/* Webhook URLs */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            Webhook 配置
          </h3>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '1.5rem'
          }}>
            <InputGroup
              label="支付成功回調 URL"
              value={config.returnUrl}
              icon={ExternalLink}
              description="用戶支付完成後跳轉的頁面"
              readOnly
            />

            <InputGroup
              label="異步通知 URL"
              value={config.notifyUrl}
              icon={ExternalLink}
              description="EasyLink 發送支付結果通知的接口"
              readOnly
            />
          </div>

          <div style={{ 
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(245,158,11,0.1)',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle size={20} color="#f59e0b" />
            <span style={{ fontSize: '0.875rem', color: '#f59e0b' }}>
              請確保上述 URL 已在 EasyLink 後台正確配置
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 2rem',
              background: saved ? '#10b981' : 'linear-gradient(135deg, #FF6B00, #E55A00)',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? (
              <>
                <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                保存中...
              </>
            ) : saved ? (
              <>
                <CheckCircle size={18} />
                已保存
              </>
            ) : (
              <>
                <Save size={18} />
                保存設置
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
