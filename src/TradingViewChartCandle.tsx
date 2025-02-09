import React, { useEffect, useRef, useState } from 'react';
import { createChart, HistogramData, Time } from 'lightweight-charts';
import { generateData } from './data';

/**
 * 실시간 데이터가 있는 Trading View 차트 컴포넌트
 * - 히스토그램 형태로 데이터 표시
 * - 실시간 데이터 업데이트 (1분 간격)
 * - High/Low Alarm 표시
 * - 날짜/시간 검색 기능
 */
const TradingViewChartBar: React.FC = () => {
  // =========== Refs ===========
  const chartContainerRef = useRef<HTMLDivElement | null>(null);  // 차트 컨테이너 DOM 요소 참조
  const chartRef = useRef<any>(null);                            // 차트 인스턴스와 데이터 저장
  const seriesRef = useRef<any>(null);                          // 히스토그램 시리즈 인스턴스 저장

  // =========== State ===========
  const [searchDate, setSearchDate] = useState(getTodayDate());  // 검색 날짜
  const [searchTime, setSearchTime] = useState(getCurrentTime()); // 검색 시간

  // =========== Utility Functions ===========
  /**
   * 현재 날짜를 YYYY-MM-DD 형식으로 반환
   */
  function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 현재 시간을 HH:MM 형식으로 반환
   */
  function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * 날짜와 시간 문자열을 타임스탬프로 변환
   */
  const convertToTimestamp = (dateStr: string, timeStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const timestamp = Date.UTC(year, month - 1, day, hours, minutes, 0);
    return Math.floor(timestamp / 1000);
  };

  /**
   * 실시간 데이터 생성기
   * - 1분마다 새로운 데이터 포인트 생성
   * - 마지막 데이터 포인트를 기준으로 시간 증가
   */
  function* getNextRealtimeUpdate(lastDataPoint: HistogramData) {
    let lastTime = Number(lastDataPoint.time);
    while (true) {
      lastTime += 60; // 1분 = 60초
      const newValue = Math.random() * (700 - 50) + 50;
      yield {
        time: lastTime as Time,
        value: newValue,
      };
    }
  }

  // =========== Event Handlers ===========
  /**
   * 검색 폼 제출 핸들러
   * - 입력된 날짜/시간에 해당하는 데이터 포인트로 차트 이동
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDate || !searchTime || !chartRef.current) return;

    const targetTimestamp = convertToTimestamp(searchDate, searchTime);
    const data = chartRef.current.data;

    // 검색 시점과 가장 가까운(±30초) 데이터 포인트 찾기
    const targetIndex = data.findIndex(
      (point: HistogramData) => Math.abs(Number(point.time) - targetTimestamp) <= 30
    );

    if (targetIndex !== -1) {
      // 찾은 데이터 포인트 주변 30개 데이터 표시
      const startIndex = Math.max(targetIndex - 30, 0);
      const endIndex = Math.min(targetIndex + 1, data.length);

      chartRef.current.chart.timeScale().setVisibleRange({
        from: data[startIndex].time as Time,
        to: data[targetIndex].time as Time,
      });
    } else {
      alert('검색한 날짜와 시간에 해당하는 데이터가 없습니다.');
    }
  };

  // =========== Chart Initialization ===========
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 차트 기본 설정
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        scaleMargins: { top: 0.1, bottom: 0.01 },
      },
      layout: {
        textColor: 'black',
        background: { color: 'white' },
      },
      grid: {
        vertLines: { color: '#e0e0e0' },
        horzLines: { color: '#e0e0e0' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(0, 0, 0, 1)', width: 2, style: 0 },
        horzLine: { color: 'rgba(0, 0, 0, 1)', width: 2, style: 0 },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        dateFormat: 'yyyy-MM-dd',
        timeFormatter: (time: Time) => {
          if (!time) return 'undefined';
          const timestamp = Number(time) * 1000;
          const date = new Date(timestamp);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}`;
        },
      },
    });

    // 히스토그램 시리즈 설정
    const barSeries = chart.addHistogramSeries({
      color: '#8297db',
      priceFormat: {
        type: 'price',
        precision: 1,
        minMove: 0.1,
      },
      priceLineVisible: false,
      lastValueVisible: false,
      autoscaleInfoProvider: () => ({
        priceRange: {
          minValue: 0,
          maxValue: 800, // High Alarm(630)보다 충분히 높게 설정
        },
      }),
    });

    // 초기 데이터 설정
    const initialData: HistogramData[] = generateData(2000).map((d) => ({
      time: d.time as Time,
      value: d.value,
    }));
    barSeries.setData(initialData);

    // 최고/최저값 가격선 추가
    const highestPoint = initialData.reduce((max, point) => (point.value > max.value ? point : max), initialData[0]);
    const lowestPoint = initialData.reduce((min, point) => (point.value < min.value ? point : min), initialData[0]);

    barSeries.createPriceLine({
      price: highestPoint.value,
      color: '#666',
      lineWidth: 1,
      axisLabelVisible: true,
      title: `Highest`,
    });

    barSeries.createPriceLine({
      price: lowestPoint.value,
      color: '#666',
      lineWidth: 1,
      axisLabelVisible: true,
      title: `Lowest`,
    });

    // High/Low Alarm 가격선 추가
    barSeries.createPriceLine({
      price: 630,
      color: 'red',
      lineWidth: 1,
      axisLabelVisible: true,
      title: `High Alarm`,
    });

    barSeries.createPriceLine({
      price: 100,
      color: 'blue',
      lineWidth: 1,
      axisLabelVisible: true,
      title: `Low Alarm`,
    });

    // 초기 표시 범위 설정 (최신 31개 데이터)
    const visibleRangeStartIndex = initialData.length - 31;
    const visibleRangeEndIndex = initialData.length - 1;

    if (visibleRangeStartIndex >= 0) {
      chart.timeScale().setVisibleRange({
        from: initialData[visibleRangeStartIndex].time as Time,
        to: initialData[visibleRangeEndIndex].time as Time,
      });
    }

    // 차트 인스턴스와 데이터 저장
    chartRef.current = { chart, data: initialData };
    seriesRef.current = barSeries;

    // 실시간 데이터 업데이트 설정
    const lastDataPoint = initialData[initialData.length - 1];
    const streamingDataProvider = getNextRealtimeUpdate(lastDataPoint);

    const intervalId = setInterval(() => {
      const update = streamingDataProvider.next();
      if (update.done) {
        clearInterval(intervalId);
        return;
      }

      // 새 데이터 추가 및 오래된 데이터 제거
      barSeries.update(update.value);
      chartRef.current.data.push(update.value);
      if (chartRef.current.data.length > 2000) {
        chartRef.current.data.shift();
      }
    }, 60000); // 1분마다 업데이트

    // =========== Tooltip 설정 ===========
    const toolTipWidth = 120;
    const toolTipHeight = 80;
    const toolTipMargin = 15;

    // Tooltip DOM 요소 생성
    const toolTip = document.createElement('div');
    toolTip.style.cssText = `
      width: ${toolTipWidth}px;
      height: auto;
      position: absolute;
      display: none;
      padding: 12px;
      box-sizing: border-box;
      font-size: 12px;
      text-align: left;
      z-index: 1000;
      top: 12px;
      left: 12px;
      pointer-events: none;
      border: 1px solid #2962FF;
      border-radius: 4px;
      background: white;
      color: black;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    `;
    chartContainerRef.current.appendChild(toolTip);

    // Crosshair 이벤트에 따른 Tooltip 위치 및 내용 업데이트
    chart.subscribeCrosshairMove(param => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        toolTip.style.display = 'none';
      } else {
        const data = param.seriesData.get(barSeries);
        if (!data || !('value' in data)) {
          return;
        }

        // Tooltip 내용 업데이트
        const value = data.value;
        const timestamp = typeof param.time === 'number'
          ? param.time
          : Number(param.time);
        const time = new Date(timestamp * 1000);
        const hours = String(time.getUTCHours()).padStart(2, '0');
        const minutes = String(time.getUTCMinutes()).padStart(2, '0');
        const formattedTime = `${hours}:${minutes}`;

        toolTip.style.display = 'block';
        toolTip.innerHTML = `
          <div style="color: #2962FF; font-weight: bold;">Usage</div>
          <div style="font-size: 16px; margin: 4px 0px; color: black">
            ${value.toFixed(1)}
          </div>
          <div style="color: #666">
            ${formattedTime}
          </div>
        `;

        // Tooltip 위치 계산 및 설정
        const coordinate = barSeries.priceToCoordinate(value);
        if (coordinate === null) {
          return;
        }

        let shiftedCoordinate = param.point.x - 50;
        shiftedCoordinate = Math.max(
          0,
          Math.min(chartContainerRef.current!.clientWidth - toolTipWidth, shiftedCoordinate)
        );

        const coordinateY = coordinate - toolTipHeight - toolTipMargin > 0
          ? coordinate - toolTipHeight - toolTipMargin
          : Math.max(
            0,
            Math.min(
              chartContainerRef.current!.clientHeight - toolTipHeight - toolTipMargin,
              coordinate + toolTipMargin
            )
          );

        toolTip.style.left = shiftedCoordinate + 'px';
        toolTip.style.top = coordinateY + 'px';
      }
    });

    chartContainerRef.current.style.cursor = 'crosshair';

    // 컴포넌트 언마운트 시 정리
    return () => {
      clearInterval(intervalId);
      chart.remove();
      if (toolTip && toolTip.parentNode) {
        toolTip.parentNode.removeChild(toolTip);
      }
    };
  }, []);

  // =========== Render ===========
  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* 검색 폼 */}
      <form
        onSubmit={handleSearch}
        style={{
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}
      >
        <input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <input
          type="time"
          value={searchTime}
          onChange={(e) => setSearchTime(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2962FF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Search
        </button>
      </form>
      <div
        ref={chartContainerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: 'auto',
        }}
      />
    </div>
  );
};

export default TradingViewChartBar;