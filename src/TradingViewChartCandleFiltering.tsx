import React, { useEffect, useRef, useState } from 'react';
import { createChart, HistogramData, Time } from 'lightweight-charts';
import { generateData } from './data';

/**
 * 기간 필터링이 가능한 Trading View 차트 컴포넌트
 * - 히스토그램 형태로 데이터 표시
 * - High/Low Alarm 표시
 * - 날짜 기간 검색 기능
 */
const TradingViewChartBarFiltering: React.FC = () => {
  // =========== Refs ===========
  const chartContainerRef = useRef<HTMLDivElement | null>(null);  // 차트 컨테이너 DOM 요소 참조
  const chartRef = useRef<any>(null);                            // 차트 인스턴스와 데이터 저장
  const seriesRef = useRef<any>(null);                          // 히스토그램 시리즈 인스턴스 저장

  // =========== State ===========
  const [startDate, setStartDate] = useState(getTodayDate());    // 시작 날짜
  const [endDate, setEndDate] = useState(getTodayDate());        // 종료 날짜
  const [totalDataPoints, setTotalDataPoints] = useState(3000); // 초기 데이터 포인트 수

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
   * 날짜 문자열을 타임스탬프로 변환
   * @param dateStr - YYYY-MM-DD 형식의 날짜 문자열
   * @param isEndDate - true인 경우 해당 날짜의 23:59:59로 설정
   */
  const convertToTimestamp = (dateStr: string, isEndDate: boolean = false) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    
    if (isEndDate) {
      date.setUTCHours(23, 59, 59, 999);
    }
    
    return Math.floor(date.getTime() / 1000);
  };

  // =========== Event Handlers ===========
  /**
   * 검색 폼 제출 핸들러
   * - 입력된 시작/종료 날짜 범위에 해당하는 데이터 포인트로 차트 이동
   */
  // handleSearch 함수 내에서 데이터 부족 시 추가 생성 로직 추가
const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  if (!startDate || !endDate || !chartRef.current) return;

  const startTimestamp = convertToTimestamp(startDate);
  const endTimestamp = convertToTimestamp(endDate, true);
  let data = chartRef.current.data;

  // 시작 시점 이전의 데이터가 부족한 경우 추가 생성
  const earliestDataTime = Number(data[0].time);
  if (startTimestamp < earliestDataTime) {
    const additionalData = generateData(2000, startTimestamp).map((d) => ({
      time: d.time as Time,
      value: d.value,
    }));
    data = [...additionalData, ...data];
    setTotalDataPoints(prev => prev + 2000);
    chartRef.current.data = data;
    seriesRef.current.setData(data);
  }

  // 검색 기간 내의 데이터 찾기
  const periodData = data.filter(
    (point: HistogramData) => 
      Number(point.time) >= startTimestamp && 
      Number(point.time) <= endTimestamp
  );

  if (periodData.length > 0) {
    chartRef.current.chart.timeScale().setVisibleRange({
      from: periodData[0].time as Time,
      to: periodData[periodData.length - 1].time as Time,
    });
  } else {
    alert('선택한 기간에 해당하는 데이터가 없습니다.');
  }
};

  // =========== Chart Initialization ===========
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 차트 기본 설정
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      rightPriceScale: {
        scaleMargins: { top: 0.02, bottom: 0.0 },
      },
      layout: {
        textColor: '#1E1F22',
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
      color: '#A4B3BF',
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
    const initialData: HistogramData[] = generateData(totalDataPoints).map((d) => ({
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
      border: 1px solid #677489;
      border-radius: 4px;
      background: white;
      color: #1E1F22;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      font-family: 'Pretendard', sans-serif;
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
          <div style="color: #677489; font-weight: bold;">Usage</div>
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
      chart.remove();
      if (toolTip && toolTip.parentNode) {
        toolTip.parentNode.removeChild(toolTip);
      }
    };
  }, []);

  // =========== Render ===========
  return (
    <div>
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
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <span>~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
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

export default TradingViewChartBarFiltering;