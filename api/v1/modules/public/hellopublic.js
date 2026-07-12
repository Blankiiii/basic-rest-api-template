const express = require('express');
const router = express.Router();

router.get('/hellopublic', (req, res) => {
  res.json({ message: 'Hello from the auto-loaded module, this is a public endpoint!' });
});

router.get('/hellopublic/:name', (req, res) => {
  res.json({ message: `Hello, ${req.params.name}!` });
});

module.exports = router;
