export const generateData = (numPoints: number) => {
  const data = [];
  let baseValue = 365;

  // timeToLocal 함수 구현
  function timeToLocal(originalTime: number) {
    const d = new Date(originalTime * 1000);
    return Date.UTC(
      d.getFullYear(),
      d.getMonth(), 
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
      d.getMilliseconds()
    ) / 1000;
  }

  const now = new Date();
  const currentTime = now.getTime();
  
  for (let i = numPoints - 1; i >= 0; i--) {
    const pointTime = currentTime - (i * 60 * 1000);
    
    const randomChange = Math.random() * 550 - 275;
    let value = baseValue + randomChange;

    if (value < 80) value = 80;
    if (value > 697) value = 697;

    // 로컬 시간으로 변환
    data.push({
      time: timeToLocal(Math.floor(pointTime / 1000)),
      value: parseFloat(value.toFixed(1)),
    });

    baseValue = value;
  }

  return data;
};