import { WolClient } from "./src/index";

const logger = new WolClient({
  collectorUrl: "http://localhost:7001",
  apiKey: "wol_BbU5we32SlYoCnLFW3bS8zObRj9NtUGwnOIS82W7",
  appName: "TestingWol",
  persist: false,
  expiresIn: 3600,
  batchSize: 5,
  flushInterval: 3000,
});

async function testAll() {
  console.log("=== 1. Level shortcuts (batched) ===");
  logger.info("Info log from test suite");
  logger.warn("Warning log from test suite");
  logger.error("Error log from test suite");
  logger.debug("Debug log from test suite");
  console.log("Queued 4 logs via level shortcuts");

  console.log("\n=== 2. Level shortcuts with metadata ===");
  logger.info("User signed in", {
    metadata: { userId: "user-123", ip: "192.168.1.1" },
  });
  // Buffer should auto-flush here (batchSize=5 reached)
  console.log("Queued 1 more — batch of 5 should auto-flush");
  await new Promise((r) => setTimeout(r, 500));

  console.log("\n=== 3. Override app_name per log ===");
  logger.error("Payment gateway timeout", {
    app_name: "PaymentService",
    metadata: { gateway: "stripe", retries: 3 },
  });

  console.log("\n=== 4. Persistent log ===");
  logger.info("Deploy v2.5.0 completed", { persist: true });

  console.log("\n=== 5. Temporary log with custom TTL ===");
  logger.debug("Short-lived trace", { expires_in: 300 });

  console.log("\n=== 6. Full log() with all fields ===");
  logger.log({
    app_name: "TestingWol",
    level: "WARN",
    message: "Disk usage at 85%",
    timestamp: new Date().toISOString(),
    metadata: { disk: "/dev/sda1", usage_pct: 85 },
    persist: false,
    expires_in: 7200,
  });

  console.log("\n=== 7. send() — immediate, bypasses buffer ===");
  const res = await logger.send({
    app_name: "TestingWol",
    level: "ERROR",
    message: "Critical: immediate send test",
    metadata: { test: true, sentAt: new Date().toISOString() },
    persist: true,
  });
  console.log("send() response:", res);

  console.log("\n=== 8. Manual flush ===");
  const flushed = await logger.flush();
  console.log(`Flushed ${flushed} buffered logs`);

  console.log("\n=== 9. Flush when buffer is empty ===");
  const emptyFlush = await logger.flush();
  console.log(`Flushed ${emptyFlush} logs (expected 0)`);

  console.log("\n=== 10. Shutdown (flush + stop timer) ===");
  logger.info("Final log before shutdown");
  await logger.shutdown();
  console.log("Shutdown complete");

  console.log("\n=== All tests passed! ===");
}

testAll().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
