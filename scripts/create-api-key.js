const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEYS_FILE = path.join(__dirname, '..', 'data', 'api-keys.json');
const dataDir = path.dirname(KEYS_FILE);

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(KEYS_FILE)) {
    fs.writeFileSync(KEYS_FILE, '[]', 'utf8');
  }
}

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createKey(name) {
  ensureDataFile();

  const rawName = name == null ? 'default' : String(name);
  if (rawName.length > 30) {
    throw new Error('Name cannot exceed 30 characters');
  }

  const key = crypto.randomBytes(24).toString('hex');
  const keys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));

  const entry = {
    name: rawName,
    keyHash: hashValue(key),
    createdAt: new Date().toISOString()
  };

  keys.push(entry);
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8');

  return {
    success: true,
    name: entry.name,
    key,
    createdAt: entry.createdAt,
    storedIn: KEYS_FILE
  };
}

if (require.main === module) {
  const nameArg = process.argv[2];
  const result = createKey(nameArg);

  console.log('API key created successfully');
  console.log(`Name: ${result.name}`);
  console.log(`Key: ${result.key}`);
  console.log(`Stored in: ${result.storedIn}`);
}

module.exports = createKey;
