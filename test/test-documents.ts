import * as XLSX from "xlsx";
import { documentManager } from "../src/documents/document-manager.js";

async function runTest() {
  console.log("🧪 Starting Document CAS & Multi-Tab Excel Preprocessor Test...\n");

  // 1. Create a dummy Multi-Tab Excel buffer in memory
  const wb = XLSX.utils.book_new();

  // Tab 1: Financials
  const ws1_data = [
    ["Metric", "Q1", "Q2", "Q3", "Q4"],
    ["Revenue ($)", 100000, 125000, 150000, 180000],
    ["Operating Profit", 25000, 32000, 41000, 52000],
    ["Growth (%)", "10%", "25%", "20%", "20%"]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1_data);
  XLSX.utils.book_append_sheet(wb, ws1, "Financial_Overview");

  // Tab 2: Server Inventory
  const ws2_data = [
    ["Server ID", "Hostname", "IP Address", "OS", "Status"],
    ["SRV-01", "app-prod-01", "172.22.30.10", "Red Hat Enterprise Linux 9", "Online"],
    ["SRV-02", "db-prod-01", "172.22.30.20", "Windows Server 2022", "Online"],
    ["SRV-03", "cache-redis-01", "172.22.30.30", "Ubuntu 24.04", "Maintenance"]
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2_data);
  XLSX.utils.book_append_sheet(wb, ws2, "Server_Inventory");

  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const excelBase64 = excelBuffer.toString("base64");

  // 2. Ingest into documentManager
  console.log("📁 1. Ingesting Multi-Tab Excel File...");
  const res1 = await documentManager.ingestDocument("Infrastructure_Report.xlsx", excelBase64);
  console.log("Ingest Result:", {
    success: res1.success,
    hash: res1.document?.hash.slice(0, 16) + "...",
    sheets: res1.document?.sheetNames,
    charCount: res1.document?.charCount,
    isDuplicate: res1.isDuplicate
  });

  if (!res1.success || !res1.document) {
    throw new Error("Excel Ingestion failed!");
  }

  // 3. Test CAS Deduplication (Ingest same buffer again)
  console.log("\n📁 2. Testing CAS Deduplication with identical buffer...");
  const res2 = await documentManager.ingestDocument("Infrastructure_Report.xlsx", excelBase64);
  console.log("Duplicate Ingest Result:", {
    success: res2.success,
    isDuplicate: res2.isDuplicate,
    hash: res2.document?.hash.slice(0, 16) + "..."
  });

  if (!res2.isDuplicate) {
    throw new Error("CAS Deduplication failed! Expected isDuplicate: true");
  }

  // 4. Test Ingesting Markdown / Text file
  console.log("\n📁 3. Ingesting Text / Markdown File...");
  const textContent = "# BigFix Security Runbook\n\n## Action 1: Deploy Patch\nEnsure all endpoints in group 'Windows-Servers' are targeted.";
  const textBase64 = Buffer.from(textContent).toString("base64");
  const res3 = await documentManager.ingestDocument("BigFix_Runbook.md", textBase64);
  console.log("Markdown Ingest Result:", {
    success: res3.success,
    hash: res3.document?.hash.slice(0, 16) + "...",
    charCount: res3.document?.charCount
  });

  // 5. Test Context Assembly
  console.log("\n📁 4. Testing Context Assembly for Active Hashes...");
  const activeHashes = [res1.document.hash, res3.document!.hash];
  const contextRes = documentManager.getPreprocessedContext(activeHashes);
  console.log("Context Assembly Summary:", {
    activeCount: contextRes.activeCount,
    totalCharacters: contextRes.totalCharacters,
    preview: contextRes.context.slice(0, 450) + "\n..."
  });

  console.log("\n✅ All Document & Multi-Tab Excel Tests Passed Successfully!");
}

runTest().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
