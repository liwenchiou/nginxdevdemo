const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
// 設定伺服器監聽的 Port，若無環境變數則預設為 3000
const port = process.env.PORT || 3000;

// 啟用 CORS，允許前端跨域請求
app.use(cors());
// 允許伺服器解析 JSON 格式的請求主體 (Request Body)
app.use(express.json());

// 建立 PostgreSQL 資料庫連線池 (Connection Pool)
// 透過環境變數 DATABASE_URL 取得連線字串，避免將密碼寫死在程式碼中 (符合資安規範)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 一個簡單的非同步錯誤捕捉包裝器 (Async Error Wrapper)
// 實作防禦性程式設計，避免在每個路由中寫滿 try/catch，並將錯誤統一交由全域錯誤處理器接手
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 健康檢查 API (Health check endpoint)
// 提供給前端背景輪詢使用，不會存取資料庫，確保查詢極度輕量快速
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { 
      // 回傳這台 API 伺服器在 Docker 叢集中的主機名稱 (Hostname)
      serverHostname: process.env.HOSTNAME || 'unknown' 
    }
  });
});

// 資料獲取與計數器 API
// 每次被呼叫時，會將資料庫中的計數器 +1
app.get('/api/data', asyncHandler(async (req, res) => {
  // 將更新計數器與回傳新數值的動作寫在同一個 SQL 語句中，確保原子性 (Atomic)
  const query = 'UPDATE page_visits SET count = count + 1 WHERE id = 1 RETURNING count;';
  const result = await pool.query(query);

  // 防呆機制：若資料庫尚未正確初始化 (找不到 id = 1 的紀錄)
  if (result.rows.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: '資料庫尚未正確初始化'
    });
  }

  // 遵循 RESTful 與統一 JSON 回傳格式規範
  res.status(200).json({
    status: 'success',
    message: '資料讀取成功',
    data: {
      count: result.rows[0].count,
      serverHostname: process.env.HOSTNAME || 'unknown'
    }
  });
}));

// 全域錯誤處理器 (Global Error Handler)
// 資安防護：只在內部 Log 印出詳細錯誤堆疊 (Stack Trace)，對外一律只回傳通用的 500 錯誤訊息，防止敏感架構資訊外洩
app.use((err, req, res, next) => {
  console.error(err.stack); // 僅記錄在伺服器內部日誌
  res.status(500).json({
    status: 'error',
    message: '伺服器內部發生錯誤'
  });
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`API 伺服器已啟動於 Port ${port}，主機名稱 (Hostname): ${process.env.HOSTNAME}`);
});
