// Vercel serverless entry — CommonJS wrapper around the compiled Express app.
require('../apps/api/dist/lib/serverlessBootstrap');
const { createApp } = require('../apps/api/dist/app');
module.exports = createApp();
