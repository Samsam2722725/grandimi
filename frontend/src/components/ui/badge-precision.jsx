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
  libelle: 'de précision moyenne — soit ±4 à ±8 cm selon l’âge',
  lien: '/methode/#precision',
  texteLien: 'Voici d’où vient ce chiffre',
}

/* Les sources RÉELLEMENT utilisées par le calcul, nommées en toutes
   lettres plutôt qu'en écussons.

   GoTall aligne les logos CDC, Harvard et NIH sous son pourcentage.
   Ces trois marques sont déposées ; CDC et NIH sont des agences
   fédérales américaines dont les règles d'usage interdisent tout
   emploi laissant entendre une caution. Les afficher reviendrait à
   affirmer qu'Harvard valide Grandimi — ce qui, sur le marché
   français, relève de la même pratique trompeuse que le pourcentage
   inventé, en plus du risque de contrefaçon de marque.

   Les trois sources ci-dessous, elles, sont dans le code : les tables
   LMS de l'OMS (who_hfa_table.go), les coefficients Khamis-Roche
   (khamis_roche_table.go) et les courbes de référence CDC citées comme
   repère de comparaison. On peut les nommer parce qu'on les emploie. */
const SOURCES = [
  { nom: 'OMS', detail: 'Tables LMS de croissance 5-19 ans' },
  { nom: 'Khamis–Roche', detail: 'Fels Longitudinal Study' },
  { nom: 'Percentile', detail: 'Suivi du couloir de croissance' },
]

export function BadgePrecision({ className }) {
  return (
    <div className={`precision ${className || ''}`}>
      {/* Toise en filigrane, comme sur l'original : elle donne au
          chiffre un contexte de mesure au lieu de le laisser flotter. */}
      <div className="precision-toise" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i} className={i % 5 === 0 ? 'est-longue' : ''} />
        ))}
      </div>

      <div className="precision-pastille">
        <span className="precision-valeur">{PRECISION_AFFICHEE.valeur}</span>
        <span className="precision-libelle">{PRECISION_AFFICHEE.libelle}</span>
      </div>

      <p className="precision-detail">
        {/* Nouvel onglet : le brouillon du questionnaire est sauvegardé,
            mais quitter le tunnel au milieu reste une sortie. */}
        <a href={PRECISION_AFFICHEE.lien} target="_blank" rel="noopener">
          {PRECISION_AFFICHEE.texteLien}
        </a>
      </p>

      <ul className="precision-sources">
        {SOURCES.map((source) => (
          <li key={source.nom}>
            <strong>{source.nom}</strong>
            <span>{source.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default BadgePrecision
