const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const basePath = '/api/v1';
const modulesDir = path.join(__dirname, 'api', 'v1', 'modules');
const publicPathFile = path.join(__dirname, 'api', 'v1', 'public-paths.json');
const { router: authorizationRouter, apiKeyRequired } = require('./api/authorization');
const { logEvent } = require('./utils/logger.js');

// --- Global Rate Limiter State ---
const rateLimit = {
  windowMs: 10000,
  max: 20,
  timeoutMs: 60000, // 1 minute timeout
  requests: new Map()
};

function globalRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'anonymous';
  const now = Date.now();
  
  // Log every single incoming request first
  logEvent('incoming_request', { ip, method: req.method, path: req.path });

  const entry = rateLimit.requests.get(ip) || { count: 0, start: now, lockedUntil: 0 };

  // 1. Check if user is currently blocked
  if (now < entry.lockedUntil) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    
    logEvent('rate_limit_blocked_request', { ip, remainingSeconds, path: req.path });
    
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `You are temporarily locked out. Please try again in ${remainingSeconds} seconds.`,
      status: 429
    });
  }

  // 2. Reset window for normal rate limit evaluation
  if (now - entry.start >= rateLimit.windowMs) {
    entry.count = 0;
    entry.start = now;
  }

  entry.count += 1;
  rateLimit.requests.set(ip, entry);

  // 3. Evaluate if limit was exceeded to trigger a 1-minute timeout
  if (entry.count > rateLimit.max) {
    entry.lockedUntil = now + rateLimit.timeoutMs;
    rateLimit.requests.set(ip, entry);

    logEvent('rate_limit_timeout_triggered', { ip, maxAllowed: rateLimit.max, timeoutMs: rateLimit.timeoutMs });

    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit of ${rateLimit.max} requests per 10 seconds exceeded. You are timed out for 1 minute.`,
      status: 429
    });
  }

  next();
}

// Apply the global rate limiter first
app.use(globalRateLimiter);
app.use(express.json());

function normalizePublicPath(route) {
  if (!route || typeof route !== 'string') {
    return null;
  }

  let normalized = route.trim();
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  if (!normalized.startsWith(basePath)) {
    normalized = `${basePath}${normalized}`;
  }

  return normalized;
}

function readPublicPathFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`Unable to read public path file ${filePath}: ${error.message}`);
    return [];
  }
}

function getRouterPaths(router) {
  if (!router || !Array.isArray(router.stack)) {
    return [];
  }

  return router.stack.flatMap((layer) => {
    if (layer.route && layer.route.path) {
      const pathValue = layer.route.path;
      return Array.isArray(pathValue) ? pathValue : [pathValue];
    }

    if (layer.name === 'router' && layer.handle) {
      return getRouterPaths(layer.handle);
    }

    return [];
  });
}

function collectModuleDefinitions(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`Modules directory not found: ${dir}`);
    return [];
  }

  function walk(currentDir) {
    return fs.readdirSync(currentDir, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        return walk(fullPath);
      }

      if (!entry.isFile() || !/\.(js|cjs|mjs)$/i.test(entry.name)) {
        return [];
      }

      try {
        const moduleExport = require(fullPath);
        const router =
          moduleExport && typeof moduleExport === 'function'
            ? moduleExport
            : moduleExport && typeof moduleExport.router === 'function'
            ? moduleExport.router
            : null;

        let publicPaths = [];
        if (Array.isArray(moduleExport?.publicPaths)) {
          publicPaths = moduleExport.publicPaths.map(normalizePublicPath).filter(Boolean);
        } else if (fullPath.includes(`${path.sep}public${path.sep}`) || fullPath.includes(`/public/`)) {
          publicPaths = getRouterPaths(router).map(normalizePublicPath).filter(Boolean);
        }

        if (!router) {
          console.warn(`Skipping ${fullPath}: expected an Express router export.`);
          return [];
        }

        return [{ router, publicPaths }];
      } catch (error) {
        console.error(`Failed to load module ${fullPath}: ${error.message}`);
        return [];
      }
    });
  }

  return walk(dir);
}

const moduleDefinitions = collectModuleDefinitions(modulesDir);
const publicPathsFromFile = readPublicPathFile(publicPathFile).map(normalizePublicPath).filter(Boolean);
const publicExceptions = [
  '/api/authorization',
  '/api/authorization/verify',
  '/api/authorization/protected',
  '/health', // Keep health check open to public pinging
  ...publicPathsFromFile,
  ...moduleDefinitions.flatMap((def) => def.publicPaths)
];

app.use(apiKeyRequired(publicExceptions));

moduleDefinitions.forEach((def) => {
  app.use(basePath, def.router);
});

app.use('/api/authorization', authorizationRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      uptime: `${Math.floor(process.uptime())}s`
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
    status: 404
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
