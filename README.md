<div align="center">

# 🚀 Nginx Dynamic Failover Demo
**零感知、零延遲的微服務架構負載均衡與自動故障轉移實戰**

[![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## ✨ 核心特色 (Features)

本專案旨在展示如何解決**開源版 Nginx 的 DNS 永久快取地雷**。透過整合 `docker-gen` 達到自動服務發現 (Service Discovery)，讓 Nginx 能夠在容器頻繁起停的微服務環境下，真正實現**「零感知熱更新」**。

- ⚡️ **自動化服務發現 (Service Discovery)**：利用 `docker-gen` 監聽 Docker events，動態更新 Nginx Upstream 路由表。
- 🛡️ **無縫故障轉移 (Failover)**：精確配置 `proxy_connect_timeout` 與 `max_fails`，當 API 節點崩潰時，Nginx 會在瞬間切換至健康節點。
- 📊 **視覺化狀態監控**：前端提供 Auto-Fetch 輪詢器與即時活躍節點燈號，拔掉容器的瞬間就能看到流量無縫接軌。
- 🐘 **高可用性架構**：後端搭載 3 個 Node.js/Express 副本與 PostgreSQL，實現完整的跨容器輪詢與狀態共享。

---

## 🚀 快速開始 (Quick Start)

### 1. 啟動環境
確保你的電腦已安裝 Docker 與 Docker Compose。直接在終端機輸入以下指令啟動叢集：

```bash
docker-compose up -d --build
```

### 2. 體驗無縫故障轉移
1. 開啟瀏覽器進入 [http://localhost:8080](http://localhost:8080)
2. 打開右上角的 **「自動輪詢 (Auto-Fetch)」** 開關，觀察流量平均分配給 `api1`, `api2`, `api3`。
3. **暴力破壞測試**：在終端機中隨機停用幾個 API 容器：
   ```bash
   docker stop api3
   docker stop api1
   ```
4. **觀察魔法發生**：回到網頁，你會發現畫面**完全沒有卡頓或報錯 (502 Bad Gateway)**！Nginx 在背景被 `docker-gen` 動態重載，並將流量瞬間導向唯一存活的 `api2`。

---

## 🏗️ 架構與設計 (Architecture)

本專案架構不使用付費版 Nginx Plus，而是透過開源工具組合出企業級的高可用性架構：

1. **Nginx 反向代理**：作為對外的唯一入口 (Port 80)，負責處理靜態資源與 `/api` 請求的負載均衡。
2. **Docker-Gen 自動化引擎**：
   - 掛載 `docker.sock` 監聽容器啟動/停止事件。
   - 透過 `upstreams.tmpl` Go Template 動態抓取帶有 `demo_api=true` 標籤的容器 IP。
   - 寫入設定檔後，自動向 Nginx 容器發送 `SIGHUP` 訊號完成平滑重載 (Smooth Reload)。
3. **API 叢集與 DB**：無狀態 (Stateless) 的 API 叢集，所有資料與計數器皆集中存放於 PostgreSQL 內。

### 💡 未來架構建議：Traefik
若你的專案將面臨大規模的微服務擴縮容 (Auto-scaling)，強烈建議改用為 Cloud-Native 而生的 [Traefik](https://traefik.io/)。Traefik 具備原生的 Docker 服務發現能力，能真正做到毫秒級的路由更新，免去維護 Nginx Template 與 Reload 的成本。

---

## 📄 授權條款 (License)
本專案採用 [MIT License](LICENSE) 授權條款，歡迎自由取用與改作。
