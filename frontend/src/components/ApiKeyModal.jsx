import { useState } from 'react';
import useTradingStore from '../store/tradingStore';

export default function ApiKeyModal() {
  const { exchange, setShowApiModal, saveApiKeys } = useTradingStore();
  const [ex, setEx] = useState(exchange);
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const handleSave = async () => {
    if (!apiKey || !secretKey) return;
    setLoading(true);
    try {
      await saveApiKeys(ex, apiKey, secretKey);
      setShowApiModal(false);
    } finally {
      setLoading(false);
    }
  };

  const guideUrl = ex === 'binance'
    ? 'https://www.binance.com/en/my/settings/api-management'
    : 'https://bingx.com/en/account/api';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-tr-card border border-tr-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-tr-border">
          <h2 className="font-bold text-sm text-tr-text">Connect Exchange Account</h2>
          <button
            onClick={() => setShowApiModal(false)}
            className="text-tr-muted hover:text-tr-text text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Exchange selector */}
          <div className="flex gap-2">
            {['binance', 'bingx'].map(e => (
              <button
                key={e}
                onClick={() => setEx(e)}
                className={`flex-1 py-2 rounded text-xs font-semibold capitalize border transition-colors ${
                  ex === e ? 'bg-tr-yellow text-[#0b0e11] border-tr-yellow' : 'border-tr-border text-tr-muted hover:text-tr-text'
                }`}
              >
                {e === 'binance' ? 'Binance Futures' : 'BingX Perpetual'}
              </button>
            ))}
          </div>

          {/* Info box */}
          <div className="bg-tr-bg rounded p-3 text-[11px] text-tr-muted border border-tr-border space-y-1">
            <p className="text-tr-text font-semibold">How to get API keys:</p>
            <p>1. Log in to your {ex === 'binance' ? 'Binance' : 'BingX'} account</p>
            <p>2. Go to Account → API Management</p>
            <p>3. Create a new API key with Futures trading enabled</p>
            <p>4. Copy the API Key and Secret Key below</p>
            <p className="text-tr-yellow">⚠ Never share your secret key with anyone</p>
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-1">
            <label className="text-tr-muted text-xs">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Paste your API key here"
              className="bg-tr-input border border-tr-border rounded px-3 py-2 text-xs text-tr-text outline-none focus:border-tr-muted"
            />
          </div>

          {/* Secret Key */}
          <div className="flex flex-col gap-1">
            <label className="text-tr-muted text-xs">Secret Key</label>
            <div className="flex items-center bg-tr-input border border-tr-border rounded px-3 gap-2 focus-within:border-tr-muted">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretKey}
                onChange={e => setSecretKey(e.target.value)}
                placeholder="Paste your secret key here"
                className="flex-1 bg-transparent py-2 text-xs text-tr-text outline-none"
              />
              <button
                onClick={() => setShowSecret(v => !v)}
                className="text-tr-muted hover:text-tr-text text-xs"
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <p className="text-[10px] text-tr-muted">
            Keys are stored only in server memory for this session and never sent to third parties.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setShowApiModal(false)}
              className="flex-1 py-2.5 rounded text-xs border border-tr-border text-tr-muted hover:text-tr-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !apiKey || !secretKey}
              className="flex-1 py-2.5 rounded text-xs font-bold bg-tr-yellow text-[#0b0e11] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
