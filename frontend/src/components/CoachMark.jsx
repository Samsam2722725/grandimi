import { useEffect, useState } from 'react';

/* Les bulles de prise en main.

   TROIS BULLES, PAS ONZE. Le concurrent en enchaîne onze — un tour de
   quatre puis un tour de sept — avant le premier geste utile. Passé la
   troisième, plus personne ne lit : on tape « Suivant » jusqu'à ce que
   ça s'arrête, et le tour a alors coûté du temps sans rien transmettre.

   La règle retenue : une bulle ne se justifie que si elle explique
   quelque chose qu'on NE DEVINE PAS. La barre d'onglets se devine. Un
   anneau découpé en six parts, non. Un compte à rebours d'une semaine
   sur une mesure, non plus. */

// Marge autour de la découpe, pour que la cible respire.
const RESPIRATION = 8;

function CoachMark({ etapes, onFini }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const etape = etapes[index];

  /* La position de la cible est relue à chaque étape ET à chaque
     redimensionnement. Calculée une seule fois au montage, elle devient
     fausse dès que le clavier virtuel s'ouvre ou que l'appareil tourne,
     et la découpe se retrouve à côté de ce qu'elle désigne. */
  useEffect(() => {
    if (!etape) return undefined;

    const mesurer = () => {
      const cible = document.querySelector(etape.cible);
      if (!cible) {
        setRect(null);
        return;
      }
      cible.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = cible.getBoundingClientRect();
      setRect({
        top: r.top - RESPIRATION,
        left: r.left - RESPIRATION,
        width: r.width + RESPIRATION * 2,
        height: r.height + RESPIRATION * 2,
      });
    };

    mesurer();
    window.addEventListener('resize', mesurer);
    return () => window.removeEventListener('resize', mesurer);
  }, [etape]);

  if (!etape) return null;

  const dernier = index === etapes.length - 1;
  const avancer = () => (dernier ? onFini() : setIndex((i) => i + 1));

  /* La bulle se place SOUS la cible quand celle-ci est dans la moitié
     haute, au-dessus sinon.

     Décidé sur la position, pas sur une mesure de la bulle : mesurer sa
     hauteur imposerait un premier rendu invisible puis un second pour la
     replacer, et la bulle sauterait à l'écran. Un seuil à 45 % suffit
     parce que la bulle ne dépasse jamais trois lignes. */
  const enBas = rect ? rect.top + rect.height / 2 < window.innerHeight * 0.45 : true;

  return (
    <div className="coach" role="dialog" aria-modal="true" aria-label="Présentation">
      {/* La découpe : un cadre vide entouré d'une ombre portée immense.
          C'est ce qui éclaire la cible sans avoir à découper un masque
          SVG, et cela suit n'importe quelle forme grâce au rayon. */}
      {rect && (
        <span
          className="coach__decoupe"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          aria-hidden="true"
        />
      )}

      {/* Sans cible trouvée, le voile reste mais la découpe disparaît :
          une bulle qui désigne le vide vaut mieux qu'un trou au hasard. */}
      {!rect && <span className="coach__voile" aria-hidden="true" />}

      <div
        className={`coach__bulle ${enBas ? 'coach__bulle--bas' : 'coach__bulle--haut'}`}
        style={rect ? { top: enBas ? rect.top + rect.height + 12 : undefined,
                        bottom: enBas ? undefined : window.innerHeight - rect.top + 12 }
                    : { top: '50%' }}
      >
        <p className="coach__texte">{etape.texte}</p>

        <div className="coach__pied">
          <span className="coach__compteur">
            {index + 1} sur {etapes.length}
          </span>

          <div className="coach__boutons">
            {/* « Passer » dès la première bulle, et visible.
                Un tour qu'on ne peut pas quitter est une rançon, pas une
                présentation — et quelqu'un qui revient sur un second
                appareil connaît déjà l'application. */}
            {!dernier && (
              <button type="button" className="coach__passer" onClick={onFini}>
                Passer
              </button>
            )}
            <button type="button" className="coach__suivant" onClick={avancer}>
              {dernier ? 'C’est parti' : 'Suivant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoachMark;
