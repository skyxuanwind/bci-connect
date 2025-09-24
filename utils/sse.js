// Shared SSE utilities for broadcasting NFC check-in events across routes

// Maintain a shared set of connected SSE clients (Response objects with optional metadata)
const sseClients = new Set();

function addClient(res, meta) {
  // Store as an object to allow filtering by meta, but keep backward compatibility
  sseClients.add({ res, meta: meta || null });
}

function removeClient(res) {
  try {
    for (const client of sseClients) {
      const targetRes = client?.res || client; // backward compatibility
      if (targetRes === res) {
        sseClients.delete(client);
      }
    }
  } catch (_) {}
}

function broadcast(event, dataObj) {
  const data = `event: ${event}\n` + `data: ${JSON.stringify(dataObj)}\n\n`;
  for (const client of sseClients) {
    const targetRes = client?.res || client; // backward compatibility
    try {
      targetRes.write(data);
    } catch (e) {
      // Remove broken connection
      try { sseClients.delete(client); } catch (_) {}
    }
  }
}

// New: broadcast to filtered clients only
function broadcastTo(filterFn, event, dataObj) {
  const data = `event: ${event}\n` + `data: ${JSON.stringify(dataObj)}\n\n`;
  for (const client of sseClients) {
    const targetRes = client?.res || client; // backward compatibility
    const meta = client?.meta || null;
    try {
      if (typeof filterFn !== 'function' || filterFn({ res: targetRes, meta })) {
        targetRes.write(data);
      }
    } catch (e) {
      try { sseClients.delete(client); } catch (_) {}
    }
  }
}

module.exports = {
  addClient,
  removeClient,
  broadcast,
  broadcastTo,
  sseClients,
};