import React from 'react';
import TradingViewChartTest from './TradingViewChart';
import TradingViewChartBar from './TradingViewChartCandle';
import TradingViewChartBarFiltering from './TradingViewChartCandleFiltering';
import "./App.css";

const App: React.FC = () => {
  return (
    <div style={{
      margin:'2rem',
    }
    }>
      <div style={{
      maxWidth:'1060px',
    }}>
      {/* <h1>TradingView Chart Test1</h1>
      <TradingViewChartTest /> */}
      {/* <h1>TradingView Chart Test - Dashboard</h1> */}
      {/* <TradingViewChartBar /> */}
      <h1>TradingView Chart Test - Period Graph</h1>
      <TradingViewChartBarFiltering />
    </div>
    </div>
    
  );
};

export default App;
