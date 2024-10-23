import React from 'react';
import TradingViewChartTest from './TradingViewChart';  // 경로가 맞는지 확인하세요.
import "./App.css";

const App: React.FC = () => {
  return (
    <div style={{
      maxWidth:'1200px',
      margin:'2rem',
    }}>
      <h1>TradingView Chart Test</h1>
      <TradingViewChartTest />
    </div>
  );
};

export default App;
