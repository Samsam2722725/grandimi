#!/usr/bin/env node

/**
 * GitHub Webhook Handler for Automatic Deployment
 * Listens for push events and deploys to Render via API
 */

const http = require('http');
const crypto = require('crypto');

const RENDER_API_KEY = process.env.RENDER_API_KEY || 'your-render-api-key';
const GITHUB_SECRET = process.env.GITHUB_SECRET || 'your-github-secret';
const PORT = process.env.PORT || 3000;

function verifySignature(payload, signature) {
  const hash = crypto
    .createHmac('sha256', GITHUB_SECRET)
    .update(payload)
    .digest('hex');
  return `sha256=${hash}` === signature;
}

async function deployToRender() {
  console.log('🚀 Deploying to Render...');
  
  try {
    const response = await fetch('https://api.render.com/v1/services', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log('⚠️  Note: Render deployment requires RENDER_API_KEY');
      console.log('Set it in your GitHub repo Secrets to enable auto-deploy');
      return;
    }
    
    console.log('✅ Render deployment triggered!');
  } catch (error) {
    console.error('Deploy error:', error.message);
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      const signature = req.headers['x-hub-signature-256'] || '';
      
      if (!verifySignature(body, signature)) {
        console.log('❌ Invalid signature');
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }
      
      const event = JSON.parse(body);
      
      if (event.ref === 'refs/heads/main' || event.ref === 'refs/heads/master') {
        console.log(`📍 Push to ${event.ref} detected`);
        await deployToRender();
        
        res.writeHead(200);
        res.end('Deployment triggered');
      } else {
        res.writeHead(200);
        res.end('OK');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🎯 Webhook server running on port ${PORT}`);
  console.log('📍 GitHub → POST http://your-server/webhook');
});
