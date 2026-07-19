import http from 'node:http';
import worker from '../../cloudflare-worker/worker.js';

const port = Number(process.env.PORT || 8787);
const maxBodyBytes = Number(process.env.GATEWAY_MAX_BODY_BYTES || 30 * 1024 * 1024);

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

const server = http.createServer(async (incoming, outgoing) => {
  try {
    const method = incoming.method || 'GET';
    const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(incoming);
    const host = incoming.headers.host || `127.0.0.1:${port}`;
    const request = new Request(`http://${host}${incoming.url || '/'}`, {
      method,
      headers: incoming.headers,
      body,
    });
    const response = await worker.fetch(request, process.env);

    outgoing.statusCode = response.status;
    response.headers.forEach((value, key) => outgoing.setHeader(key, value));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    outgoing.statusCode = status;
    outgoing.setHeader('content-type', 'application/json');
    outgoing.end(JSON.stringify({ error: status === 413 ? 'Request body too large' : 'Gateway request failed' }));
  }
});

server.headersTimeout = 65_000;
server.requestTimeout = 190_000;
server.listen(port, '0.0.0.0');

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
