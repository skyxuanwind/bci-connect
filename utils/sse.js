// Shared SSE utilities for broadcasting NFC check-in events across routes

// Maintain a shared set of connected SSE clients (Response objects)
const sseClients = new Set();

function addClient(res) {
  sseClients.add(res);
}

function removeClient(res) {
  try {
    sseClients.delete(res);
  } catch (_) {}
}

function broadcast(event, dataObj) {
  const data = `event: ${event}\n` + `data: ${JSON.stringify(dataObj)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(data);
    } catch (e) {
      // Remove broken connection
      try { sseClients.delete(res); } catch (_) {}
    }
  }
}

module.exports = {
  addClient,
  removeClient,
  broadcast,
  sseClients,
};