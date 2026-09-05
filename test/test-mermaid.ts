import { smartWrapNodeText, sanitizeMermaidCode } from '../frontend/src/utils/mermaidGuardrail';
import { generateStandaloneExportHtml } from '../frontend/src/utils/htmlExport';

console.log('🧪 Testing Mermaid Guardrail & Smart Wrap...');

// 1. Test colon wrapping
const text1 = "全球和平轉化：由武器到農具之生態重建";
const wrapped1 = smartWrapNodeText(text1);
console.log('Test 1 (Colon):', wrapped1);
if (!wrapped1.includes('<br/>')) throw new Error('Test 1 failed to wrap colon');

// 2. Test punctuation wrapping
const text2 = "審判自領袖始，社會不義致使聖所成為亂石堆";
const wrapped2 = smartWrapNodeText(text2);
console.log('Test 2 (Punctuation):', wrapped2);
if (!wrapped2.includes('<br/>')) throw new Error('Test 2 failed to wrap punctuation');

// 3. Test sanitizeMermaidCode on unquoted brackets and arrows
const badCode = `
flowchart TD
  A[未帶引號的節點 (帶括號: 特殊字)] --> B{判定點 (帶問號?)}
  B -- 條件 (符合) --> C[系統轉移 -> 升級]
`;
const sanitized = sanitizeMermaidCode(badCode);
console.log('Test 3 (Sanitized Code):\n' + sanitized);
if (!sanitized.includes('A["未帶引號')) throw new Error('Test 3 failed to quote A');
if (!sanitized.includes('B{"判定點')) throw new Error('Test 3 failed to quote B');
if (!sanitized.includes('系統轉移 到 升級')) throw new Error('Test 3 failed to replace arrow');

// 4. Test generateStandaloneExportHtml
const sampleMd = `
# 系統架構測試
\`\`\`mermaid
flowchart TD
  Start[啟動服務] --> Process[處理請求] --> End[完成]
\`\`\`
`;
const exportHtml = generateStandaloneExportHtml(sampleMd, "Test Report");
if (!exportHtml.includes('smartWrapNodeText') || !exportHtml.includes('mermaid-tall-chart')) {
  throw new Error('Test 4 failed: exportHtml missing enhanced features');
}
console.log('Test 4 (Export HTML generated successfully, length:', exportHtml.length, 'bytes)');

console.log('🎉 All Mermaid tests passed successfully!');
