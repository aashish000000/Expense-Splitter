const WebSocket = require('ws');

const groupSockets = new Map();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const urlParts = req.url.split('/');
    const groupId = urlParts[urlParts.length - 1];

    if (!groupId) {
      ws.close(1008, 'Group ID is required in URL');
      return;
    }

    if (!groupSockets.has(groupId)) {
      groupSockets.set(groupId, new Set());
    }
    groupSockets.get(groupId).add(ws);

    const broadcastToGroup = (msgObj) => {
      const peers = groupSockets.get(groupId) || new Set();
      const data = JSON.stringify(msgObj);
      peers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    };

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        broadcastToGroup(msg);
      } catch {
        // Ignore malformed JSON
      }
    });

    ws.on('close', () => {
      const set = groupSockets.get(groupId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          groupSockets.delete(groupId);
        }
      }
    });
  });

  return wss;
}

module.exports = { setupWebSocket };
