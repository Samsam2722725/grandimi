#!/usr/bin/env node
/* Les chiffres de grandimi.com en une commande, sans se connecter nulle part.

     node scripts/stats.mjs            → 14 derniers jours
     node scripts/stats.mjs 30         → 30 derniers jours
     node scripts/stats.mjs 14 2026-10-08   → avant / après le 8 octobre

   Lit STATS_TOKEN dans le .env (lecture seule, voir
   internal/api/stats_lecture.go) et interroge /api/stats sur le serveur
   Render. Le premier appel peut prendre ~1 minute : le serveur gratuit
   s'endort après 15 min sans visite. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const API = 'https://grandimi-api.onrender.com'
const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

function lireToken() {
  try {
    const env = readFileSync(join(racine, '.env'), 'utf8')
    const ligne = env.split(/\r?\n/).find((l) => l.startsWith('STATS_TOKEN='))
    return ligne ? ligne.slice('STATS_TOKEN='.length).trim().replace(/^"|"$/g, '') : ''
  } catch {
    return ''
  }
}

const token = lireToken()
if (!token) {
  console.error('STATS_TOKEN absent du .env.')
  process.exit(1)
}

const jours = Number(process.argv[2]) || 14
const coupure = process.argv[3] || null

async function lire(chemin) {
  const r = await fetch(`${API}/api/stats/${chemin}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(90_000),
  })
  if (r.status === 401) throw new Error('Code refusé : STATS_TOKEN n’est pas (ou pas le même) sur Render.')
  if (!r.ok) throw new Error(`${chemin} : HTTP ${r.status}`)
  return r.json()
}

const PLANS = {
  plan_kDRLNzUYWNk7Q: '1 mois (réduit)', plan_k6qMJhHTUAxxT: '3 mois (réduit)', plan_mogKkUH0XwhOb: 'À vie (réduit)',
  plan_h9ArY1lNE2TIw: '1 mois', plan_b8mqqcvAzLPi0: '3 mois', plan_9pFFLL6o41cOU: 'À vie',
}

const ETAPES = [
  ['page_vue', 'Visites'],
  ['tunnel_demarre', 'Commencent le questionnaire'],
  ['tunnel_email_saisi', 'Donnent leur e-mail'],
  ['paywall_vue', 'Voient le paywall'],
  ['paywall_checkout_ouvert', 'Ouvrent le paiement'],
  ['whop_paiement_termine', 'Paient'],
]

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '—')

function somme(lignes, evenement, filtre = () => true) {
  return lignes.filter((l) => l.evenement === evenement && filtre(l.jour)).reduce((s, l) => s + l.visiteurs, 0)
}

function bloc(titre, lignes, filtre) {
  const nbJours = new Set(lignes.filter((l) => filtre(l.jour)).map((l) => l.jour)).size || 1
  console.log(`\n${titre} (${nbJours} j)`)
  let prec = null
  for (const [ev, libelle] of ETAPES) {
    const n = somme(lignes, ev, filtre)
    const taux = prec === null ? '' : `  ${pct(n, prec)} de l’étape d’avant`
    console.log(`  ${libelle.padEnd(30)} ${String(n).padStart(5)}  (${(n / nbJours).toFixed(1)}/j)${taux}`)
    prec = n
  }
}

try {
  const [{ jours: parJour }, { ventes }, general] = await Promise.all([
    lire(`jours?jours=${jours}`),
    lire(`ventes?jours=${jours}`),
    lire('general'),
  ])

  console.log(`grandimi.com — ${jours} derniers jours (visiteurs distincts par jour)`)
  if (coupure) {
    bloc(`Avant le ${coupure}`, parJour, (j) => j < coupure)
    bloc(`Depuis le ${coupure}`, parJour, (j) => j >= coupure)
  } else {
    bloc('Total', parJour, () => true)
  }

  console.log('\nJour par jour : visites → questionnaire → e-mail → paywall → paiement ouvert → payé')
  for (const jour of [...new Set(parJour.map((l) => l.jour))]) {
    const v = ETAPES.map(([ev]) => String(somme(parJour, ev, (j) => j === jour)).padStart(4))
    console.log(`  ${jour}  ${v.join('  ')}`)
  }

  console.log(`\nPaiements reçus par Whop (${ventes.length}) — tes tests sont dedans, rien ne les distingue ici :`)
  for (const v of ventes.slice(0, 20)) console.log(`  ${v.date}  ${v.statut.padEnd(8)} ${PLANS[v.plan_id] || v.plan_id}`)

  console.log(`\nComptes : ${general.total_users ?? '?'} au total, ${general.premium_users ?? '?'} premium.`)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
