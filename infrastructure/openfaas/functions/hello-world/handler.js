'use strict';

/**
 * Hello World - Sample Node.js 18 OpenFaaS Function
 * Endpoint: GET/POST /function/hello-world
 */
module.exports = async (event, context) => {
  const method = event.method || 'GET';
  
  let body = {};
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      // ignore parse errors
    }
  }

  const name = body.name || event.query?.name || 'World';

  console.log(`[hello-world] Invoked via ${method} - name: ${name}`);

  return context.status(200).succeed({
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString(),
    runtime: 'Node.js 18',
    method,
  });
};
