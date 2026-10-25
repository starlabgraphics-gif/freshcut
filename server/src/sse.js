// Tiny Server-Sent-Events hub: userId -> Set<res>
const clients = new Map();

function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
}

function removeClient(userId, res) {
  const set = clients.get(userId);
  if (set) {
    set.delete(res);
    if (set.size === 0) clients.delete(userId);
  }
}

function emit(userId, event, data) {
  const set = clients.get(userId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch (e) { /* dropped */ }
  }
}

function emitMany(userIds, event, data) {
  for (const id of userIds) emit(id, event, data);
}

setInterval(() => {
  for (const set of clients.values()) {
    for (const res of set) {
      try { res.write(': hb\n\n'); } catch (e) { /* dropped */ }
    }
  }
}, 25000);

module.exports = { addClient, removeClient, emit, emitMany };
