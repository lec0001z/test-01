const path = require('path');
const express = require('express');
const app = require('./api');

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
