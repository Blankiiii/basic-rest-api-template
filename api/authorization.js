const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const KEYS_FILE = path.join(__dirname, '..', 'data', 'api-keys.json');

function ensureDataFile() {
  const dataDir = path.dirname(KEYS_FILE);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(KEYS_FILE)) {
    fs.writeFileSync(KEYS_FILE, '[]', 'utf8');
  }
}

function readKeys() {
  ensureDataFile();

  try {
    return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeKeys(keys) {
  ensureDataFile();
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8');
}

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getApiKeyFromRequest(req) {
  const headerKey = req.get('api-key') || req.get('Api-Key') || req.get('api-Key') || req.get('API-KEY');
  if (headerKey) {
    return headerKey;
  }

  const authorizationHeader = req.get('authorization') || req.get('Authorization');
  if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.slice(7).trim();
  }

  return req.body?.apiKey || req.query?.apiKey || null;
}

function authenticate(req, res, next) {
  const apiKey = getApiKeyFromRequest(req);

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing API key',
      status: 401
    });
  }

  const keys = readKeys();
  const isValid = keys.some((entry) => entry.keyHash === hashValue(apiKey));

  if (!isValid) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key',
      status: 403
    });
  }

  next();
}

function normalizePublicPath(route) {
  if (!route || typeof route !== 'string') {
    return null;
  }

  let normalized = route.trim();
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  return normalized;
}

function apiKeyRequired(exceptions = []) {
  const normalized = exceptions
    .filter(Boolean)
    .map((route) => normalizePublicPath(route))
    .filter(Boolean);

  return (req, res, next) => {
    const requestPath = req.path;

    if (
      normalized.some((exception) =>
        exception.endsWith('*')
          ? requestPath.startsWith(exception.slice(0, -1))
          : requestPath === exception
      )
    ) {
      return next();
    }

    return authenticate(req, res, next);
  };
}

router.get('/', (req, res) => {
  res.json({
    message: 'Authorization service is ready',
    endpoints: ['/verify', '/protected']
  });
});

router.post('/verify', (req, res) => {
  const apiKey = getApiKeyFromRequest(req);

  if (!apiKey) {
    return res.status(400).json({ error: 'Provide an API key' });
  }

  const keys = readKeys();
  const isValid = keys.some((entry) => entry.keyHash === hashValue(apiKey));

  res.json({ valid: isValid });
});

router.get('/protected', authenticate, (req, res) => {
  res.json({ message: 'Access granted', authorized: true });
});

module.exports = {
  router,
  authenticate,
  apiKeyRequired,
  normalizePublicPath
};
