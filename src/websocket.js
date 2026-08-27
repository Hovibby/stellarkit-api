const WebSocket = require("ws");
const { server } = require("./config/stellar");

function setupWebSocket(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer, path: "/stream/ledgers" });

  wss.on("connection", (ws) => {
    const closeHandler = server.ledgers().stream({
      onmessage: (ledger) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(ledger));
        }
      },
      onerror: (err) => {
        console.error("Ledger stream error:", err);
      },
    });

    ws.on("close", () => {
      if (closeHandler && typeof closeHandler === "function") closeHandler();
    });
  });

  return wss;
}

module.exports = { setupWebSocket };
