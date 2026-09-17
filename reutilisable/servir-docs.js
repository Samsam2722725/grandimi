// Sert le dossier docs/ tel qu'il sera publié, pour vérifier l'artefact
// réellement déployé et non le serveur de développement.
const http = require('http');
const fs = require('fs');
const path = require('path');

const RACINE = process.argv[2];
const PORT = Number(process.argv[3]) || 8766;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let fichier = path.join(RACINE, url === '/' ? 'index.html' : url);

  if (!fichier.startsWith(RACINE)) {
    res.statusCode = 403;
    res.end('interdit');
    return;
  }
  if (!fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
    // SPA sans routeur : tout le reste retombe sur index.html.
    fichier = path.join(RACINE, 'index.html');
  }

  res.setHeader('content-type', TYPES[path.extname(fichier)] || 'application/octet-stream');
  res.end(fs.readFileSync(fichier));
}).listen(PORT, () => console.log('[docs] http://localhost:' + PORT + '/'));
