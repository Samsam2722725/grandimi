/* ============================================================
   ÉCRAN DE PREUVE — ce que vaut l'estimation
   ============================================================
   Forme reprise de l'écran « Quelle est la précision de notre
   prédiction de taille ? » de GoTall : une toise en filigrane, un
   grand chiffre dans une pastille lumineuse, une bande de sources en
   bas. La forme est efficace et elle est reprise telle quelle.

   LE CHIFFRE, LUI, N'EST PAS REPRIS — ET C'EST DÉLIBÉRÉ.

   GoTall affiche « 98,7 % de précision ». Le moteur de Grandimi rend
   une marge de ±4 à ±8 cm selon l'âge et la vitesse de croissance
   (internal/estimator/v2_enhanced.go, calculateV2Confidence, bornes
   lignes 593-598). La landing de Grandimi annonce déjà « ±4 à ±8 cm ».

   Écrire 98,7 % ici produirait donc DEUX problèmes, pas un :

   1. Une allégation chiffrée invérifiable sur un produit de santé
      vendu à des mineurs. C'est l'article L121-2 du code de la
      consommation (pratique commerciale trompeuse), et c'est
      précisément le grief que le reste du tunnel évite avec soin.

   2. Une contradiction interne. Le visiteur qui lit « 98,7 % » ici et
      « ±8 cm » sur sa page de résultat trois écrans plus loin conclut
      que l'un des deux chiffres est faux. Il a raison, et il n'achète
      pas.

   Le chiffre affiché est donc la marge réelle, présentée comme un
   argument plutôt que comme une concession — ce qui est déjà la
   position de marque de Grandimi partout ailleurs.

   ─────────────────────────────────────────────────────────────
   SI TU VEUX QUAND MÊME UN POURCENTAGE, il se change ICI, en une
   ligne, et nulle part ailleurs. Pour qu'il reste défendable il doit
   dire SUR QUOI il porte dans la même respiration : « 97,7 % » seul
   est une allégation ; « 97,7 %, soit ±4 cm sur 175 cm » est un
   calcul que n'importe qui peut refaire. La seconde forme se défend,
   la première non.
   ============================================================ */

const PRECISION_AFFICHEE = {
  valeur: '± 4 cm',
  unite: '',
  libelle: 'de marge annoncée',
  /* Ce qui rend la borne haute honnête sans affaiblir la borne basse :
     la marge n'est pas un chiffre unique, elle se resserre avec l'âge,
     et le dire ici évite la contradiction avec la page de résultat. */
  precision: 'dès 16 ans — et jamais plus de ± 8 cm avant',
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

      <p className="precision-detail">{PRECISION_AFFICHEE.precision}</p>

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
