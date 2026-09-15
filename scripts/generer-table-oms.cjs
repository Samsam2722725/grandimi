/*
 * Regenere internal/estimator/who_hfa_table.go depuis les tableaux OMS.
 *
 *   node scripts/generer-table-oms.cjs
 *
 * Telecharge les deux classeurs « height-for-age, 5-19 ans, tableaux etendus
 * (z-scores) » publies par l OMS, en extrait les colonnes Month / L / M / S et
 * ecrit le fichier Go.
 *
 * A relancer UNIQUEMENT si l OMS revise la reference. Le fichier produit est
 * versionne : il n y a pas d etape de generation dans la CI ni au build, et il
 * ne doit pas y en avoir — une table de reference qui change toute seule entre
 * deux deploiements ferait bouger les estimations de tous les utilisateurs
 * sans que personne l ait decide.
 *
 * Aucune dependance : le .xlsx est un zip, on le lit avec zlib.
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SOURCES = {
  hfaGarcons:
    'https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/height-for-age-(5-19-years)/hfa-boys-z-who-2007-exp.xlsx?sfvrsn=7fa263d_2',
  hfaFilles:
    'https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/height-for-age-(5-19-years)/hfa-girls-z-who-2007-exp.xlsx?sfvrsn=79d310ee_2',
}

const DEST = path.join(__dirname, '..', 'internal', 'estimator', 'who_hfa_table.go')

/* Lecture minimale d un zip : on parcourt les en-tetes locaux et on rend le
   contenu de l entree demandee. Les .xlsx de l OMS sont produits par Excel,
   donc en deflate simple sans chiffrement ni archive multi-volume. */
function lireDansZip(buffer, nomVoulu) {
  let i = 0
  while (i < buffer.length - 4) {
    if (buffer.readUInt32LE(i) !== 0x04034b50) break
    const methode = buffer.readUInt16LE(i + 8)
    const tailleCompressee = buffer.readUInt32LE(i + 18)
    const longueurNom = buffer.readUInt16LE(i + 26)
    const longueurExtra = buffer.readUInt16LE(i + 28)
    const debutNom = i + 30
    const nom = buffer.slice(debutNom, debutNom + longueurNom).toString()
    const debutDonnees = debutNom + longueurNom + longueurExtra

    if (nom === nomVoulu) {
      const brut = buffer.slice(debutDonnees, debutDonnees + tailleCompressee)
      return methode === 0 ? brut : zlib.inflateRawSync(brut)
    }
    i = debutDonnees + tailleCompressee
  }
  throw new Error('entree introuvable dans le zip : ' + nomVoulu)
}

function lignesDuClasseur(xlsx) {
  const feuille = lireDansZip(xlsx, 'xl/worksheets/sheet1.xml').toString('utf8')
  const rows = [...feuille.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((m) => m[1])

  // La premiere ligne est l en-tete (Month, L, M, S, StDev, SD5neg...).
  return rows.slice(1).map((row) => {
    const c = {}
    for (const m of row.matchAll(/<c r="([A-Z]+)\d+"[^>]*>(?:<v>([^<]*)<\/v>)?/g)) c[m[1]] = m[2]
    return { mois: +c.A, l: +c.B, m: +c.C, s: +c.D }
  })
}

async function telecharger(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error('HTTP ' + r.status + ' sur ' + url)
  return Buffer.from(await r.arrayBuffer())
}

const ENTETE = `package estimator

// TABLE OMS — TAILLE POUR AGE, 5 A 19 ANS
//
// Source : WHO Growth Reference 2007 for school-aged children and
// adolescents, indicateur height-for-age, tableaux etendus (z-scores).
// Colonnes Month / L / M / S reprises telles quelles. Librement
// redistribuables.
//
// Les mois vont de 61 (5 ans 1 mois) a 228 (19 ans), soit 168 points par sexe.
//
// L VAUT 1 SUR TOUTE LA TABLE — verifie a chaque generation, la generation
// echoue sinon. La formule generale de Cole
//
//     z = ((X/M)^L - 1) / (L*S)
//
// se reduit donc a z = (X - M) / (M * S), et son inverse a X = M * (1 + z*S).
// On conserve malgre tout la colonne S telle que publiee plutot qu un
// ecart-type pre-calcule : le jour ou l OMS revise la table, on recopie les
// memes colonnes sans avoir a refaire un calcul intermediaire.
//
// POURQUOI CETTE TABLE EXISTE ICI. Sans elle, l estimateur ignorait si un
// adolescent etait grand ou petit POUR SON AGE : il ne regardait que la
// taille des parents, et la taille de l enfant ne servait que de plancher.
// Un garcon de 14 ans mesurant 185 cm s entendait donc repondre qu il avait
// fini de grandir. Voir percentile.go pour l usage.
//
// FICHIER GENERE par scripts/generer-table-oms.cjs. Ne pas editer a la main.

type pointLMS struct {
	mois int
	m    float64
	s    float64
}
`

async function main() {
  const blocs = []

  for (const [nomVar, url] of Object.entries(SOURCES)) {
    const points = lignesDuClasseur(await telecharger(url))

    const horsNorme = points.filter((p) => p.l !== 1)
    if (horsNorme.length > 0) {
      throw new Error(
        `${nomVar} : ${horsNorme.length} ligne(s) avec L != 1. La simplification ` +
          `z = (X-M)/(M*S) ne tient plus — il faut repasser a la formule de Cole ` +
          `complete dans percentile.go AVANT de regenerer.`,
      )
    }

    const lignes = points.map((p) => `\t{${p.mois}, ${p.m.toFixed(4)}, ${p.s.toFixed(6)}},`)
    blocs.push(`var ${nomVar} = []pointLMS{\n${lignes.join('\n')}\n}`)
    console.log(`${nomVar} : ${points.length} points, mois ${points[0].mois} a ${points[points.length - 1].mois}`)
  }

  fs.writeFileSync(DEST, ENTETE + '\n' + blocs.join('\n\n') + '\n')
  console.log('ecrit : ' + DEST)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
