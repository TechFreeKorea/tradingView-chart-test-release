import React from 'react';
import TradingViewChartTest from './TradingViewChart';
import TradingViewChartBar from './TradingViewChartCandle';
import "./App.css";

const App: React.FC = () => {
  return (
    <div style={{
      maxWidth:'1200px',
      margin:'2rem',
    }}>
      <h1>TradingView Chart Test1</h1>
      <TradingViewChartTest />
      <h1>TradingView Chart Test2</h1>
      <TradingViewChartBar />
    </div>
  );
};

export default App;
