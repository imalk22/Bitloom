import Header from './components/Header';
import Chart from './components/Chart';
import LeftPanel from './components/LeftPanel';
import TradeForm from './components/TradeForm';
import BottomPanel from './components/BottomPanel';
import Notification from './components/Notification';
import useSocket from './hooks/useSocket';

export default function App() {
  useSocket();

  return (
    <div className="h-screen flex flex-col bg-tr-bg overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Order Book / Trades */}
        <div className="w-52 border-r border-tr-border flex-shrink-0 overflow-hidden">
          <LeftPanel />
        </div>

        {/* Center: Chart + Bottom Panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
          <div className="flex-1 relative min-h-0">
            <Chart />
          </div>
          <div className="h-56 border-t border-tr-border flex-shrink-0">
            <BottomPanel />
          </div>
        </div>

        {/* Right: Trade Form */}
        <div className="w-72 border-l border-tr-border flex-shrink-0 overflow-y-auto scrollbar-thin">
          <TradeForm />
        </div>
      </div>

      <Notification />
    </div>
  );
}
