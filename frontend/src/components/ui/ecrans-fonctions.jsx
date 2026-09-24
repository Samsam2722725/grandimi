/* Écrans « fonctionnalités » et « études » du questionnaire, sur le modèle
   de GoTall : un titre, un visuel, rien d'autre.

   Seules des fonctions qui existent sont montrées : les captures viennent de
   l'application, et le plan du jour reprend des actions réelles du planner.
   Pas de logos d'institutions sur l'écran « études » : un logo laisse croire
   à une caution ; un résultat cité avec sa source, non. */

export function FonctionCapture({ image, alt }) {
  return (
    <div className="fonction-capture">
      <picture>
        <source srcSet={`/apercus/${image}.webp`} type="image/webp" />
        <img src={`/apercus/${image}.png`} alt={alt} />
      </picture>
    </div>
  )
}

const ACTIONS_DU_JOUR = [
  { texte: 'Suspension à la barre', duree: '5 × 15 s', faite: true },
  { texte: 'Petit-déjeuner avec protéines', duree: 'matin', faite: true },
  { texte: 'Séance du mois : dos et hanches', duree: '10 min', faite: false },
  { texte: 'Écrans coupés 45 min avant de dormir', duree: '22 h', faite: false },
]

export function FonctionPlan() {
  return (
    <div className="fonction-plan">
      <ul>
        {ACTIONS_DU_JOUR.map(({ texte, duree, faite }) => (
          <li key={texte} className={faite ? 'est-faite' : ''}>
            <span className="fonction-plan-case" aria-hidden="true">
              {faite ? '✓' : ''}
            </span>
            <span className="fonction-plan-texte">{texte}</span>
            <span className="fonction-plan-duree">{duree}</span>
          </li>
        ))}
      </ul>
      <p className="fonction-plan-plus">+ 7 autres actions aujourd’hui</p>
    </div>
  )
}

const ETUDES = [
  {
    resultat: 'L’hormone de croissance est surtout libérée pendant le sommeil profond.',
    source: 'Takahashi, Kipnis et Daughaday — Journal of Clinical Investigation, 1968',
  },
  {
    resultat:
      'La taille adulte est héréditaire à 68–93 % selon le pays et le sexe. Le reste dépend de l’environnement.',
    source: 'Silventoinen et al. — Twin Research, 2003',
  },
  {
    resultat:
      'La taille adulte s’estime sans radiographie, à partir de ta taille, ton poids et celle de tes parents.',
    source: 'Khamis et Roche — Pediatrics, 1994',
  },
]

export function EtudesPubliees() {
  return (
    <div className="etudes">
      <ul>
        {ETUDES.map(({ resultat, source }) => (
          <li key={source}>
            <p className="etudes-resultat">{resultat}</p>
            <p className="etudes-source">{source}</p>
          </li>
        ))}
      </ul>
      <p className="etudes-note">Études publiées, citées pour leurs résultats. Aucune n’a évalué Grandimi.</p>
    </div>
  )
}
