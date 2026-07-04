// 取得 HTML 畫面上的各個 DOM 元素
const fetchBtn = document.getElementById('fetchBtn');
const autoFetchBtn = document.getElementById('autoFetchBtn');
const counterDisplay = document.getElementById('counterDisplay');
const serverDisplay = document.getElementById('serverDisplay');
const logContainer = document.getElementById('logContainer');

// 用於記錄「自動輪詢」定時器的變數
let autoFetchInterval = null;

// 用於記錄每個 API 節點「最後一次回報健康」的時間戳記
let nodeStatus = {
  api1: 0,
  api2: 0,
  api3: 0
};

// 用於記錄每個 API 節點「各自被分配到幾次請求」的累計次數
let nodeHitCounts = {
  api1: 0,
  api2: 0,
  api3: 0
};

// 格式化時間，產生 [HH:MM:SS.ms] 的字串格式供日誌使用
function formatTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
}

// 在畫面右側的日誌區塊新增一筆訊息
function addLog(msg, type = 'success-log') {
  const div = document.createElement('div');
  div.className = type;
  // 使用 innerHTML 來支援 HTML 標籤（用來替特定文字上色）
  div.innerHTML = `[${formatTime()}] ${msg}`;
  logContainer.appendChild(div);
  
  // 自動將捲軸滾動到最底部，確保永遠看到最新的日誌
  logContainer.scrollTop = logContainer.scrollHeight;
}

// 根據各節點的回報狀態，更新畫面上的綠色狀態燈號
function updateDashboard() {
  const now = Date.now();
  ['api1', 'api2', 'api3'].forEach(nodeId => {
    const el = document.getElementById(`node-${nodeId}`);
    if (el) {
      // 容錯判斷機制：
      // 因為背景程式每 300 毫秒會輪詢一次，三台伺服器跑完一輪大約需要 0.9 秒。
      // 所以只要在「過去 2 秒內」有收到該伺服器的健康回報，我們就認定它還活著，為它加上 active 樣式（亮綠燈）。
      // 反之，若超過 2 秒沒消息，代表容器可能掛了，我們就移除 active 樣式（燈號熄滅）。
      if (now - nodeStatus[nodeId] < 2000) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });
}
// 設定每 200 毫秒執行一次燈號更新邏輯
setInterval(updateDashboard, 200);

// 背景靜默健康檢查（專門用來維持狀態燈號，不會寫入前台日誌）
async function pollHealth() {
  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success') {
        const hostname = result.data.serverHostname;
        // 如果該伺服器回報成功，則更新它的最後存活時間戳記
        if (nodeStatus[hostname] !== undefined) {
          nodeStatus[hostname] = Date.now();
        }
      }
    }
  } catch (e) {
    // 忽略連線錯誤，這樣終端機拔除容器時前台才不會跳出一堆報錯
  }
}
// 設定每 300 毫秒在背景偷偷打一次 Health API
setInterval(pollHealth, 300);

// 向 API 獲取主要資料（包含寫入資料庫並觸發日誌顯示）
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`);
    }
    const result = await response.json();
    
    if (result.status === 'success') {
      const { count, serverHostname } = result.data;
      
      // 更新畫面左側的「總呼叫次數」與「處理伺服器名稱」
      counterDisplay.textContent = count;
      serverDisplay.textContent = serverHostname.toUpperCase();
      
      // 同時更新該節點的最後存活時間（當作一次健康的證明）
      if (nodeStatus[serverHostname] !== undefined) {
        nodeStatus[serverHostname] = Date.now();
        
        // 將該節點專屬的「被呼叫次數」加一，並更新到燈號下方的數字
        if (nodeHitCounts[serverHostname] !== undefined) {
          nodeHitCounts[serverHostname]++;
          const countEl = document.getElementById(`count-${serverHostname}`);
          if (countEl) {
            countEl.textContent = nodeHitCounts[serverHostname];
          }
        }
      }
      
      // 將伺服器名稱用 span 包起來，套用亮藍色 CSS 類別，讓它在日誌中更明顯
      addLog(`請求成功 | 總次數: ${count} | 處理節點: <span class="highlight-node">${serverHostname}</span>`, 'success-log');
    }
  } catch (error) {
    addLog(`連線失敗: ${error.message}`, 'error-log');
    serverDisplay.textContent = '連線異常';
  }
}

// 綁定「發送單次請求」按鈕的點擊事件
fetchBtn.addEventListener('click', fetchData);

// 綁定「自動輪詢」按鈕的點擊事件
autoFetchBtn.addEventListener('click', () => {
  if (autoFetchInterval) {
    // 若已開啟，則關閉自動輪詢
    clearInterval(autoFetchInterval);
    autoFetchInterval = null;
    autoFetchBtn.textContent = '自動輪詢：關閉';
    autoFetchBtn.classList.remove('active');
    addLog('自動輪詢已停止', 'info-log');
  } else {
    // 若未開啟，則設定每 500 毫秒打一次主 API
    autoFetchInterval = setInterval(fetchData, 500);
    autoFetchBtn.textContent = '自動輪詢：開啟';
    autoFetchBtn.classList.add('active');
    addLog('自動輪詢已啟動 (間隔 500ms)', 'info-log');
    
    // 立即發送第一次請求，不用乾等半秒
    fetchData();
  }
});
