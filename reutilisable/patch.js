// Applique des remplacements exacts sur un fichier en preservant sa fin
// de ligne dominante (le depot est en CRLF cote frontend).
const fs = require('fs');

function eolDominant(s) {
  const crlf = (s.match(/\r\n/g) || []).length;
  const lf = (s.match(/\n/g) || []).length - crlf;
  return crlf >= lf ? '\r\n' : '\n';
}

// remplacements : [[avant, apres], ...] ecrits en \n uniquement.
function patcher(chemin, remplacements) {
  const brut = fs.readFileSync(chemin, 'utf8');
  const eol = eolDominant(brut);
  let s = brut.replace(/\r\n/g, '\n');

  for (const [avant, apres] of remplacements) {
    if (!s.includes(avant)) {
      throw new Error(chemin + ' — motif introuvable :\n' + avant.slice(0, 120));
    }
    const occurrences = s.split(avant).length - 1;
    if (occurrences > 1) {
      throw new Error(chemin + ' — motif ambigu (' + occurrences + ' occurrences) :\n' + avant.slice(0, 120));
    }
    s = s.replace(avant, apres);
  }

  fs.writeFileSync(chemin, s.replace(/\n/g, eol));
  console.log(chemin + ' — ' + remplacements.length + ' remplacement(s), fins de ligne ' + (eol === '\r\n' ? 'CRLF' : 'LF'));
}

module.exports = { patcher };
