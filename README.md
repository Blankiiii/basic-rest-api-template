# Basic REST API Template

A simple modular Express REST API template with auto-loaded endpoint modules, api-key generation scripts, and rate limiting with timeouts.

## Example Api Key
this apikey is found under data/api-keys.json "demo" but hashed, meaning if you want to actually use this remove the demo entry
```
f7c88d9c11aa05590aefd8e8e60db875b58ffd2d4b2dd429
```

## Directory Structure

```text
├── api/
│   └── v1/
│       ├── modules/
│       │   ├── auth/
│       │   │   └── hello.js
│       │   ├── public/
│       │   │   ├── createapikey.js
│       │   │   └── hellopublic.js
│       ├── public-paths.json
│       └── authorization.js
├── data/
│   ├── admin-keys.json
│   ├── api-keys.json
│   └── logs.jsonl
├── scripts/
│   ├── create-api-key.js
│   └── test-rate-limit.js
├── utils/
│   └── logger.js
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
```

## How to use

(Node.js is required)

1. Run `npm install` to install express and setup your project.
2. If you want to run the project in development mode with auto-reload, use `npm run dev`. Otherwise, use `npm start`.
3. Check the scripts folder for extra utilities like creating keys or running rate-limit test loops.

## Contents

- server.js - main entry point that applies global rate limits, logs every incoming request, and auto-loads endpoint modules
- scripts - script files to manually create API keys or test the server limits
- utils/logger.js - logging module to write events down to data/logs.jsonl
- api/v1/modules - in there you find the public folder, any endpoint created there is public, not needing an api key, and auth which does require one

## Usage

* To test the rate limiter, you can run `npm run testratelimit` while your server is up. 
* If you send over 20 requests per second to any endpoint across the API, your IP will get a temporary 1-minute timeout block.
* Every single request hitting the server automatically gets tracked and logged into the `data/logs.jsonl` file.

### Example Responses

Too many requests error:
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit of 20 requests per second exceeded. You are timed out for 1 minute.",
  "status": 429
}
```

Trying to request while timed out:
```json
{
  "error": "Too Many Requests",
  "message": "You are temporarily locked out. Please try again in 45 seconds.",
  "status": 429
}
```
