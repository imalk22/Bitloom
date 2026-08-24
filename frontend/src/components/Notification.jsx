import useTradingStore from '../store/tradingStore';

export default function Notification() {
  const { notification } = useTradingStore();
  if (!notification) return null;

  const colors = {
    success: 'bg-tr-green text-[#0b0e11]',
    error: 'bg-tr-red text-white',
    info: 'bg-tr-card text-tr-text border border-tr-border',
  };

  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold z-50 max-w-sm ${colors[notification.type] || colors.info}`}>
      {notification.msg}
    </div>
  );
}
