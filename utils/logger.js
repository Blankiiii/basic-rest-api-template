const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(LOG_DIR, 'logs.jsonl');

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '', 'utf8');
  }
}

function formatEvent(type, payload) {
  return {
    type,
    timestamp: new Date().toISOString(),
    payload
  };
}

function logEvent(type, payload = {}) {
  ensureLogFile();
  const entry = formatEvent(type, payload);
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
}

function readLogs(limit = 100) {
  ensureLogFile();
  const contents = fs.readFileSync(LOG_FILE, 'utf8').trim();
  if (!contents) {
    return [];
  }

  const lines = contents.split(/\r?\n/);
  return lines
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { type: 'invalid_log_line', raw: line };
      }
    });
}

module.exports = {
  logEvent,
  readLogs
};
