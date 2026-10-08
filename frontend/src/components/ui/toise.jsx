/* La toise : la règle graduée contre le mur, avec un trait par mesure.
   C'est l'élément signature de Grandimi — on l'utilise partout où l'on
   mesure quelque chose (accueil, taille génétique).

   `reperes` : [{ cm, label, accent }] — chaque trait posé sur la règle.
   `min` / `max` : bornes de la graduation, en cm. */
export function Toise({ min = 150, max = 190, reperes = [], hauteur = 260, anime = false }) {
  const graduations = []
  for (let cm = min; cm <= max; cm += 1) graduations.push(cm)
  const y = (cm) => ((max - cm) / (max - min)) * hauteur
  // Deux repères proches (père 175, génétique 176) : on décale l'étiquette
  // du second pour qu'elles ne se chevauchent pas.
  const decalages = {}
  const places = []
  // Le repère orange garde sa place ; les autres étiquettes s'écartent.
  ;[...reperes].sort((r1, r2) => (r2.accent ? 1 : 0) - (r1.accent ? 1 : 0) || y(r1.cm) - y(r2.cm)).forEach((r) => {
    let pos = y(r.cm)
    while (places.some((p) => Math.abs(p - pos) < 24)) pos += 6
    places.push(pos)
    decalages[r.label] = pos - y(r.cm)
  })

  return (
    <div className="toise" style={{ height: hauteur }}>
      <div className="toise-regle" aria-hidden="true">
        {graduations.map((cm) => {
          const dix = cm % 10 === 0
          const cinq = cm % 5 === 0
          return (
            <span
              key={cm}
              className={'toise-trait' + (dix ? ' is-dix' : cinq ? ' is-cinq' : '')}
              style={{ top: y(cm) }}
            >
              {dix && <span className="toise-chiffre">{cm}</span>}
            </span>
          )
        })}
      </div>
      {reperes.map((r, i) => (
        <div
          key={r.label}
          className={'toise-repere' + (r.accent ? ' is-accent' : '') + (anime && r.accent ? ' is-anime' : '')}
          style={{ top: y(r.cm), '--depart': `${y(r.depuis ?? r.cm) - y(r.cm)}px`, animationDelay: `${0.25 + i * 0.08}s` }}
        >
          <span className="toise-repere-ligne" />
          <span className="toise-repere-texte" style={{ transform: `translateY(${decalages[r.label]}px)` }}>
            <span className="toise-repere-label">{r.label}</span>
            {r.valeur !== false && <span className="toise-repere-cm">{r.texte ?? `${r.cm} cm`}</span>}
          </span>
        </div>
      ))}
    </div>
  )
}
