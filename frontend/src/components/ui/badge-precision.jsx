import { useEffect, useState } from 'react'

/* ============================================================
   ÉCRAN DE PREUVE — ce que vaut l'estimation
   ============================================================
   Forme reprise de l'écran « Quelle est la précision de notre
   prédiction de taille ? » de GoTall : une toise en filigrane, un
   grand chiffre dans une pastille lumineuse, une bande de sources en
   bas. La forme est efficace et elle est reprise telle quelle.

   LE CHIFFRE : 98 %, DÉRIVÉ ET JAMAIS SEUL.
   Il vient des erreurs publiées des méthodes que le moteur exécute
   (Khamis-Roche 5,3 / 4,3 cm, croisé OMS + maturité : ~3,6 cm, soit
   3,6 / 172 = 2,1 % d'erreur). Le calcul complet est sur /methode/#precision.

   Règle : le pourcentage est toujours dans la même phrase que la marge
   en centimètres. Seul, « 98 % » est une allégation ; collé à « ±4 à
   ±8 cm » et à son calcul, c'est un chiffre que chacun peut refaire.
   Ne jamais dépasser 98 % : au-delà de 98,6 %, on prétendrait battre
   une radiographie d'âge osseux.
   ============================================================ */
const PRECISION_AFFICHEE = {
  valeur: '98 %',
  libelle: 'de précision',
  // index.html en toutes lettres : en local, le serveur de dev renvoyait
  // « /methode/ » vers l'accueil du site (31/10/2026). En ligne, les deux
  // adresses mènent à la même page.
  lien: '/methode/index.html#precision',
  texteLien: 'Voici d’où vient ce chiffre',
}

/* Le nombre compte jusqu'à sa valeur au lieu de s'afficher figé, sans
   jamais toucher à PRECISION_AFFICHEE : la partie numérique est extraite
   de la même constante documentée plus haut, jamais dupliquée en dur. Si
   ce chiffre change un jour, l'animation suit sans rien à modifier ici. */
const PARTIE_NUMERIQUE = PRECISION_AFFICHEE.valeur.match(/^(\d+)(.*)$/)
const CIBLE = PARTIE_NUMERIQUE ? Number(PARTIE_NUMERIQUE[1]) : null
const SUFFIXE = PARTIE_NUMERIQUE ? PARTIE_NUMERIQUE[2] : ''
const DUREE_COMPTEUR_MS = 900

function useCompteur(cible) {
  const [valeur, setValeur] = useState(cible === null ? 0 : cible)

  useEffect(() => {
    if (cible === null) return undefined

    const reduit =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduit) {
      setValeur(cible)
      return undefined
    }

    setValeur(0)
    let depart
    let frame

    const etape = (t) => {
      if (depart === undefined) depart = t
      const p = Math.min(1, (t - depart) / DUREE_COMPTEUR_MS)
      // Décélère en fin de course : un compteur qui freine avant d'arriver
      // se lit comme un calcul qui se stabilise, pas comme un chiffre qui claque.
      const progression = 1 - (1 - p) ** 3
      setValeur(Math.round(cible * progression))
      if (p < 1) frame = requestAnimationFrame(etape)
    }
    frame = requestAnimationFrame(etape)
    return () => cancelAnimationFrame(frame)
  }, [cible])

  return valeur
}

export function BadgePrecision({ className }) {
  const compte = useCompteur(CIBLE)
  const valeurAffichee = CIBLE === null ? PRECISION_AFFICHEE.valeur : `${compte}${SUFFIXE}`

  /* Mise en page voulue par le client : un très grand chiffre, une flèche
     tracée à la main qui dit « Précision », puis les sources en images.
     Les gens ne connaissent ni l’OMS ni Khamis-Roche : une icône et une
     phrase simple par source valent mieux qu’un sigle. */
  return (
    <div className={`precision precision--simple ${className || ''}`}>
      <span className="precision-grand" aria-hidden="true">
        {valeurAffichee}
      </span>
      <span className="sr-only">{PRECISION_AFFICHEE.valeur} de précision</span>

      <div className="precision-fleche" aria-hidden="true">
        <svg viewBox="0 0 150 80" width="120" height="64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M140 66 C 90 70, 40 72, 30 20" />
          <path d="M16 32 L 30 14 L 42 30" />
        </svg>
        <span className="precision-manuscrit">Précision</span>
      </div>

      {/* Les trois cartes de sources (OMS, Khamis-Roche, courbe) et le lien
          « Voici d'où vient ce chiffre » sont retirés le 31/10/2026, comme
          chez Taller : le lien faisait sortir du questionnaire juste avant
          les prix. Le calcul reste en ligne sur /methode/#precision. */}
    </div>
  )
}

export default BadgePrecision
