const express = require('express');
const router = express.Router();
const createKey = require('../../../../scripts/create-api-key.js');

function handleCreateKey(req, res) {
  const ip = req.ip || req.connection.remoteAddress || 'anonymous';
  const name = req.body?.name || req.query?.name || ip;

  try {
    const result = createKey(name);

    res.json({
      message: 'API key created successfully',
      key: result.key,
      name: result.name,
      createdAt: result.createdAt,
      issuedTo: ip
    });
  } catch (error) {
    if (error.message === 'Name cannot exceed 30 characters') {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
        status: 400
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      status: 500
    });
  }
}

router.post('/createkey', handleCreateKey);
router.get('/createkey', handleCreateKey);

module.exports = router;
