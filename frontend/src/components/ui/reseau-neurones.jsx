import { useEffect, useMemo, useState } from 'react'

/* ============================================================
   ÉCRAN DE PREUVE — le réseau qui calcule
   ============================================================
   Forme reprise de l'écran « The World's Best Height Prediction Model »
   de GoTall (captures du 19/09/2026) : quatre couches de nœuds, des
   arêtes qui portent des poids signés, une pulsation qui parcourt le
   réseau. Le dispositif marche pour une raison simple : il donne à voir
   un CALCUL là où le visiteur ne voyait qu'un formulaire de plus.

   DEUX ÉCARTS ASSUMÉS AVEC L'ORIGINAL.

   La couleur. Le vert de GoTall n'est pas repris — l'accent orange est
   l'identité de Grandimi, et c'est la règle déjà posée pour le reste du
   tunnel (cf. funnel.css : « la structure est reprise de l'inspiration,
   l'identité non »).

   Le sens. Grandimi ne fait pas tourner un réseau de neurones : le
   calcul est Khamis-Roche croisé avec un suivi de percentile OMS, plus
   une correction de maturité (v2_enhanced.go). Dessiner un réseau et
   écrire « notre IA » serait faux. La figure est donc présentée pour ce
   qu'elle est — les signaux collectés qui convergent vers une
   estimation — et le titre de l'écran parle du MODÈLE, pas d'IA. C'est
   la seule version de cet écran qu'on peut défendre devant la DGCCRF.

   Les poids affichés sont décoratifs et tirés une fois pour toutes au
   montage : les recalculer à chaque rendu les ferait clignoter, et les
   faire varier laisserait croire qu'ils décrivent une vraie inférence.
   ============================================================ */

// Quatre couches, comme sur l'original : 4 entrées, 5 + 5 cachées, 4 sorties.
const COUCHES = [4, 5, 5, 4]

const LARGEUR = 320
const HAUTEUR = 230
const MARGE_X = 26

/* Générateur déterministe plutôt que Math.random : deux montages
   successifs (un retour en arrière dans le tunnel, par exemple) doivent
   redonner exactement le même dessin. Un réseau qui se redessine
   différemment à chaque passage se lit comme un décor, pas comme un
   calcul. */
function alea(graine) {
  let etat = graine
  return () => {
    etat = (etat * 1664525 + 1013904223) % 4294967296
    return etat / 4294967296
  }
}

function construireReseau() {
  const tirer = alea(20260919)

  const couches = COUCHES.map((nombre, indexCouche) => {
    const x = MARGE_X + (indexCouche * (LARGEUR - 2 * MARGE_X)) / (COUCHES.length - 1)
    const pas = HAUTEUR / (nombre + 1)
    return Array.from({ length: nombre }, (_, i) => ({
      x,
      y: pas * (i + 1),
      // Le rang sert au décalage de la pulsation : une couche s'allume
      // après la précédente, de gauche à droite.
      couche: indexCouche,
    }))
  })

  const aretes = []
  for (let c = 0; c < couches.length - 1; c += 1) {
    couches[c].forEach((depart, iDepart) => {
      couches[c + 1].forEach((arrivee, iArrivee) => {
        const poids = (tirer() * 2.8 - 1.4).toFixed(2)
        aretes.push({
          cle: `${c}-${iDepart}-${iArrivee}`,
          x1: depart.x,
          y1: depart.y,
          x2: arrivee.x,
          y2: arrivee.y,
          couche: c,
          poids,
          /* Une arête sur sept porte son poids en clair. Toutes les
             afficher, comme le fait l'original, rend la figure
             illisible sous 380 px de large — et la moitié des
             étiquettes s'y superposent déjà. */
          etiquetee: (iDepart * 5 + iArrivee) % 7 === 0,
          /* Relevé de 0,1–0,35 à 0,2–0,5 : au repos, la figure se lisait
             comme un filigrane plutôt que comme le calcul qu'elle
             représente. */
          opacite: 0.2 + tirer() * 0.3,
        })
      })
    })
  }

  return { couches, aretes }
}

export function ReseauNeurones({ className }) {
  const { couches, aretes } = useMemo(() => construireReseau(), [])

  /* La pulsation parcourt les couches une par une. Elle est pilotée en
     JS et non en CSS parce que chaque couche doit s'allumer avec un
     décalage qui dépend de son rang, et qu'il n'y a que quatre états :
     une animation CSS par couche coûterait plus de lignes pour le même
     résultat. */
  const [couchActive, setCoucheActive] = useState(0)

  useEffect(() => {
    /* Respecte le réglage système « réduire les animations ». Sans ce
       garde, l'écran pulse en continu chez quelqu'un qui a justement
       demandé que rien ne bouge — et le tunnel s'adresse à des
       adolescents, dont une partie non nulle le règle pour cette
       raison précise. */
    const reduit =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduit) return undefined

    const id = setInterval(() => {
      setCoucheActive((precedent) => (precedent + 1) % COUCHES.length)
    }, 620)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        className="reseau"
        /* La figure est décorative : elle ne porte aucune information
           que le titre et le sous-titre de l'écran ne donnent pas déjà.
           L'annoncer au lecteur d'écran lui ferait épeler soixante
           nœuds sans nom pour rien. */
        role="presentation"
        aria-hidden="true"
      >
        {aretes.map((arete) => (
          <g key={arete.cle}>
            <line
              x1={arete.x1}
              y1={arete.y1}
              x2={arete.x2}
              y2={arete.y2}
              className={`reseau-arete ${arete.couche === couchActive ? 'est-active' : ''}`}
              style={{ opacity: arete.couche === couchActive ? 0.55 : arete.opacite }}
            />
            {arete.etiquetee && (
              <text
                x={(arete.x1 + arete.x2) / 2}
                y={(arete.y1 + arete.y2) / 2 - 2}
                className="reseau-poids"
                textAnchor="middle"
              >
                {arete.poids > 0 ? `+${arete.poids}` : arete.poids}
              </text>
            )}
          </g>
        ))}

        {couches.flat().map((noeud, index) => (
          <circle
            key={`n-${index}`}
            cx={noeud.x}
            cy={noeud.y}
            r="7.5"
            className={`reseau-noeud ${noeud.couche === couchActive ? 'est-active' : ''}`}
          />
        ))}
      </svg>
    </div>
  )
}

export default ReseauNeurones
