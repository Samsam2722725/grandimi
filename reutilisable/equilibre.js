// Vérifie l'équilibre des délimiteurs d'un fichier Go, en ignorant les
// chaînes, les runes et les commentaires. Ce n'est pas un compilateur —
// juste de quoi attraper une accolade ou une parenthèse manquante quand
// aucun toolchain Go n'est installé sur la machine.
const fs = require('fs');

const GUILLEMET = '"';
const APOSTROPHE = "'";
const BACKTICK = '`';
const ANTISLASH = '\\';

function verifier(chemin) {
  const s = fs.readFileSync(chemin, 'utf8');
  let i = 0, acc = 0, par = 0, cro = 0, ligne = 1;
  let chaine = false, brute = false, rune = false, cmtL = false, cmtB = false;

  while (i < s.length) {
    const c = s[i], d = s[i + 1];
    if (c === '\n') { ligne++; if (cmtL) cmtL = false; }

    if (cmtL) { i++; continue; }
    if (cmtB) { if (c === '*' && d === '/') { cmtB = false; i += 2; continue; } i++; continue; }
    if (chaine) { if (c === ANTISLASH) { i += 2; continue; } if (c === GUILLEMET) chaine = false; i++; continue; }
    if (brute) { if (c === BACKTICK) brute = false; i++; continue; }
    if (rune) { if (c === ANTISLASH) { i += 2; continue; } if (c === APOSTROPHE) rune = false; i++; continue; }

    if (c === '/' && d === '/') { cmtL = true; i += 2; continue; }
    if (c === '/' && d === '*') { cmtB = true; i += 2; continue; }
    if (c === GUILLEMET) { chaine = true; i++; continue; }
    if (c === BACKTICK) { brute = true; i++; continue; }
    if (c === APOSTROPHE) { rune = true; i++; continue; }

    if (c === '{') acc++; else if (c === '}') acc--;
    else if (c === '(') par++; else if (c === ')') par--;
    else if (c === '[') cro++; else if (c === ']') cro--;

    if (acc < 0 || par < 0 || cro < 0) {
      console.log('PROBLEME ' + chemin + ' : délimiteur fermé en trop, ligne ' + ligne);
      return false;
    }
    i++;
  }

  const ok = acc === 0 && par === 0 && cro === 0 && !chaine && !brute && !cmtB;
  console.log(
    (ok ? 'OK       ' : 'PROBLEME ') + chemin +
    '  {}=' + acc + ' ()=' + par + ' []=' + cro +
    (chaine ? ' — chaîne non fermée' : '') +
    (brute ? ' — chaîne brute non fermée' : '') +
    (cmtB ? ' — commentaire de bloc non fermé' : '')
  );
  return ok;
}

const fichiers = process.argv.slice(2);
let tout = true;
for (const f of fichiers) { if (!verifier(f)) tout = false; }
process.exit(tout ? 0 : 1);
