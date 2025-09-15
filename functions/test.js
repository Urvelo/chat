// Quick test endpoint
const { onCall } = require('firebase-functions/v2/https');

exports.testEndpoint = onCall(async (request) => {
  console.log('Test endpoint called!');
  return {
    message: 'Test works!',
    timestamp: Date.now(),
    hasData: !!request.data
  };
});