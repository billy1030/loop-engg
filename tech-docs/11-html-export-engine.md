# Chapter 11: Standalone HTML Export Engine Specification
## 獨立離線 HTML 匯出引擎架構與 Mermaid 向量圖渲染規格

本章詳細記錄參考 **`c:\ai\sls`** 的離線匯出設計，為 **Mini Chat Bot（Loop Engineering 架構）** 打造的 **全功能獨立 HTML 匯出引擎（Standalone HTML Export Engine）**。

---

## 一、設計目標與業務價值

在與 AI 小助手完成深度問答、代碼審查或端點健康報告（如 BigFix / ADCS 遷移診斷）後，工程師與管理層通常需要將結論分享給無開發環境的外部人員或存檔留存。

傳統 Markdown 檔案依賴專用閱讀器，且無法直接離線渲染 Mermaid 流程圖；而純 PDF 則喪失互動性與暗黑主題。

**本引擎實作的獨立 HTML 特色：**
1. **單一自包含檔案（Self-Contained Single File）**：將 CSS、Marked 語法解析器、Mermaid.js 圖表引擎打包進 HTML，**開箱即用，點擊即開，無需啟動任何 Node.js 伺服器**！
2. **完美動態 Mermaid 向量圖**：攔截 ` ```mermaid ` 代碼區塊，瀏覽器離線以 SVG 向量格式高清晰渲染。
3. **雙模主題即時切換（Light / Dark Theme）**：內建懸浮工具列，支援一鍵切換深色與淺色護眼配色。
4. **一鍵列印 / 存為標準 PDF（Print / Save as PDF）**：內建 `@media print` 樣式，列印時自動隱藏工具列與頂部 Banner，產出標準 A4 規格紙本報告。

---

## 二、HTML 匯出雙層支援架構

系統在 Web UI 上提供了 **兩個維度的匯出按鈕**：

```
                                  ┌────────────────────────────────┐
                                  │      Mini Chat Bot Web UI      │
                                  └───────────────┬────────────────┘
                                                  │
                ┌─────────────────────────────────┴─────────────────────────────────┐
                ▼                                                                   ▼
┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
│  維度 A：全會話匯出 (Header Export Button)   │    │ 維度 B：單輪精華匯出 (Bubble Footer Button)  │
│                                              │    │                                              │
│ • 位於頂部 Header 中間靠右                   │    │ • 位於每條 Assistant 回覆氣泡右下角          │
│ • 彙整整場對話的所有「問題」與「回答」       │    │ • 只匯出當前這一則詳細的報告或決策矩陣       │
│ • 自動命名為 `YYYY-MM-DD_HH-mm-ss.html`      │    │ • 自動依前 40 字元摘要命名為檔案名稱        │
└──────────────────────────────────────────────┘    └──────────────────────────────────────────────┘
```

---

## 三、技術實作核心（`frontend/src/utils/htmlExport.ts`）

### 1. Mermaid 攔截與非同步渲染機制
透過改寫 `marked.Renderer.code`，在遇到 `lang === 'mermaid'` 時不直接輸出 pre/code，而是收集至暫存物件並注入專屬 DOM 容器，待 DOM 載入後透過 `mermaid.render()` 渲染為高畫質 SVG：

```javascript
// 1. 自訂 Marked 渲染器攔截 mermaid
renderer.code = function(code, lang) {
  if (lang === 'mermaid') {
    var id = 'mermaid-render-' + (++mCount) + '-' + Date.now();
    rawMermaidMap[id] = code.trim();
    return '<div class="mermaid-wrapper" id="' + id + '"></div>';
  }
  return '<pre><code>' + escaped + '</code></pre>';
};

// 2. 非同步遍歷渲染所有向量圖
async function renderMermaid() {
  for (var id of Object.keys(rawMermaidMap)) {
    var res = await mermaid.render(id + '-svg', rawMermaidMap[id]);
    document.getElementById(id).innerHTML = res.svg;
  }
}
```

### 2. 純前端免伺服器下載觸發
利用瀏覽器 `Blob` 與 `URL.createObjectURL` 實現點擊即時下載，無需後端磁碟 I/O：

```typescript
export function downloadHtmlFile(content: string, filename: string = "export.html") {
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

---

## 四、操作指南

1. **全會話匯出**：
   - 在任何聊天視窗中，點擊頂部工具列右側的 **`📥 Export HTML`** 按鈕。
   - 瀏覽器將自動下載包含完整問答、時間戳與樣式的 HTML 文件。
2. **單條回答匯出**：
   - 在任何 Assistant 回答氣泡的底部指標列最右側，點擊 **`📥 Export HTML`**。
   - 即可單獨下載該則報告的獨立 HTML。
3. **開啟與分享**：
   - 雙擊下載的 `.html` 檔案，在任何 Chrome / Edge / Safari 瀏覽器打開。
   - 點擊右下角懸浮按鈕 **`🌓 Theme`** 可切換深淺模式；點擊 **`🖨️ Print / Save PDF`** 即可另存為 PDF。
