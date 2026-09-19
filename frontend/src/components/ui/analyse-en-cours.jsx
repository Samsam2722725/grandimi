import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

/* ============================================================
   L'ÉCRAN QUI RÉFLÉCHIT
   ============================================================
   Tous les tunnels concurrents posent cet écran entre le dernier
   champ et le résultat, et pour une raison qui n'est pas cosmétique :
   un chiffre qui apparaît instantanément après trente questions se lit
   comme une formule ; le même chiffre après une analyse qu'on a vue se
   dérouler se lit comme un calcul. La valeur perçue de la réponse
   dépend du temps visible mis à la produire.

   ICI IL FAIT AUSSI UN VRAI TRAVAIL, et c'est ce qui le rend légitime.
   L'API tourne sur l'offre gratuite de Render : quand l'instance dort,
   la première requête prend jusqu'à une minute. Jusqu'à présent ce
   délai se passait sur un bouton grisé marqué « Analyse en cours… »,
   sans rien indiquer — le pire endroit pour perdre quelqu'un qui a
   répondu à trente questions. Cet écran occupe ce temps.

   TROIS RÈGLES QUI LE SÉPARENT D'UNE FAUSSE BARRE DE CHARGEMENT.

   1. Les étapes annoncées sont celles que le serveur exécute vraiment
      (Khamis-Roche, suivi de percentile OMS, correction de maturité,
      facteurs de mode de vie — cf. v2_enhanced.go). Aucune invention.

   2. La barre n'atteint jamais 100 % avant que la réponse soit là. Une
      barre qui arrive au bout puis attend est un mensonge que
      l'utilisateur voit.

   3. Au-delà du budget d'animation, l'attente est NOMMÉE au lieu
      d'être maquillée. Même règle que sur la page de paiement.
   ============================================================ */

/* Durée minimale de l'écran. En dessous, sur une API chaude, les
   quatre lignes défileraient trop vite pour être lues et l'écran
   passerait pour un clignotement.

   Au-dessus, on ferait attendre pour le spectacle quelqu'un dont la
   réponse est déjà arrivée — et sur mobile, quatre secondes et demie
   d'attente inutile suffisent à faire fermer l'onglet. */
const DUREE_MIN_MS = 4400

// Passé ce délai, l'attente vient du réseau et non de l'animation :
// on le dit.
const DELAI_AVANT_MESSAGE_MS = 9000

const ETAPES = [
  'Lecture de tes mesures',
  'Projection Khamis–Roche',
  'Croisement avec les courbes OMS',
  'Correction selon ta maturité',
  'Pondération de tes habitudes',
]

export function AnalyseEnCours({ pret, onFini, erreur, onReessayer }) {
  const [rang, setRang] = useState(0)
  const [attenteLongue, setAttenteLongue] = useState(false)
  /* `onFini` est recréé à chaque rendu du parent ; le garder dans une
     ref évite de relancer les minuteries à chaque fois — ce qui
     rallongerait l'écran indéfiniment sur un parent qui se rerend.

     La ref est mise à jour dans un effet et non pendant le rendu :
     écrire `.current` en plein rendu casse le rendu concurrent de
     React, qui peut abandonner puis rejouer un rendu — la ref garderait
     alors une valeur venue d'un rendu jeté. */
  const finiRef = useRef(onFini)
  useEffect(() => {
    finiRef.current = onFini
  }, [onFini])

  const pasMs = DUREE_MIN_MS / ETAPES.length

  useEffect(() => {
    const id = setInterval(() => {
      setRang((precedent) => Math.min(ETAPES.length, precedent + 1))
    }, pasMs)
    return () => clearInterval(id)
  }, [pasMs])

  useEffect(() => {
    const id = setTimeout(() => setAttenteLongue(true), DELAI_AVANT_MESSAGE_MS)
    return () => clearTimeout(id)
  }, [])

  /* La sortie demande les DEUX conditions : l'animation a fini de se
     dérouler ET la réponse est arrivée. L'une sans l'autre donnerait
     soit un écran qui saute, soit une barre pleine qui attend. */
  useEffect(() => {
    if (erreur) return
    if (pret && rang >= ETAPES.length) finiRef.current()
  }, [pret, rang, erreur])

  /* Tant que la réponse n'est pas là, la barre plafonne juste avant la
     fin : la dernière fraction appartient à l'arrivée du résultat. */
  const avancement = Math.min(rang / ETAPES.length, pret ? 1 : 0.92)

  return (
    /* `night` porte les jetons de surface sombre (funnel.css les scope à
       `.funnel, .interstitial, .night`, jamais à `:root`). Sans cette
       classe, cet écran tombe sur le style de base pensé pour le papier
       crème de la landing : fond clair, titre en serif, et un anneau de
       progression dont la couleur d'accent ne résout pas. */
    <div className="night analyse">
      <div className="analyse-anneau" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <circle className="analyse-piste" cx="60" cy="60" r="52" />
          <circle
            className="analyse-arc"
            cx="60"
            cy="60"
            r="52"
            style={{
              strokeDasharray: 2 * Math.PI * 52,
              strokeDashoffset: 2 * Math.PI * 52 * (1 - avancement),
            }}
          />
        </svg>
        <span className="analyse-pourcent">{Math.round(avancement * 100)} %</span>
      </div>

      <h1 className="analyse-titre">On analyse tes réponses</h1>

      {/* `aria-live="polite"` : les lignes se cochent toutes seules,
          sans action de l'utilisateur. Sans cette annonce, un lecteur
          d'écran reste muet pendant toute la durée de l'analyse. */}
      <ul className="analyse-etapes" aria-live="polite">
        {ETAPES.map((libelle, index) => (
          <li
            key={libelle}
            className={
              index < rang ? 'est-faite' : index === rang ? 'est-en-cours' : 'est-a-venir'
            }
          >
            <span className="analyse-puce" aria-hidden="true">
              {index < rang ? <Check size={13} strokeWidth={3} /> : null}
            </span>
            {libelle}
          </li>
        ))}
      </ul>

      {erreur ? (
        /* Une erreur ici bloque la seule sortie de l'écran : il n'a ni
           bouton « retour » ni barre de progression cliquable. Sans cette
           reprise, trente écrans de réponses finissent sur un cul-de-sac
           qu'un rechargement seul dénoue — en repartant du début. */
        <div className="analyse-echec">
          <p className="funnel-error" role="alert">
            {erreur}
          </p>
          <button type="button" className="funnel-cta" onClick={onReessayer}>
            Réessayer
          </button>
        </div>
      ) : (
        attenteLongue &&
        !pret && (
          <p className="analyse-attente" role="status">
            Le serveur met plus de temps que d’habitude à répondre. On continue
            d’attendre — ne ferme pas la page.
          </p>
        )
      )}
    </div>
  )
}

export default AnalyseEnCours
