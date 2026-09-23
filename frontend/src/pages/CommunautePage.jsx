import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, Pin, Users } from 'lucide-react';
import apiClient from '../lib/api';
import Spinner from '../components/Spinner';

/* Le fil, en lecture seule.

   Personne d'autre que l'équipe n'y publie, et il n'existe aucune route
   d'écriture côté serveur. Un fil ouvert entre mineurs imposerait une
   modération, un dispositif de signalement et une politique de
   rétention ; le DSA ajoute ses propres obligations dès qu'un service
   est accessible aux mineurs. Rien d'autre dans ce produit n'impose
   cela, et un forum non modéré sur une application qui parle de taille
   à des adolescents devient un endroit où l'on se compare et où l'on se
   moque. Ce risque-là ne se répare pas après coup. */

const CATEGORIES = {
  reponse: 'Question fréquente',
  demontage: 'Idée reçue',
  methode: 'Comment ça marche',
};

/* Le niveau de preuve, AFFICHÉ. Une application de santé qui ne
   distingue pas ce qui est démontré de ce qui est plausible demande
   qu'on la croie sur parole. */
const PREUVES = {
  etabli: 'Établi',
  probable: 'Probable',
  incertain: 'Incertain',
};

function CommunautePage({ onLu }) {
  const [pubs, setPubs] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [panne, setPanne] = useState(false);
  const aMarquer = useRef([]);

  const charger = useCallback(() => {
    apiClient
      .getCommunaute()
      .then((d) => {
        setPubs(d.publications || []);
        setPanne(false);
      })
      .catch(() => setPanne(true));
  }, []);

  useEffect(charger, [charger]);

  /* Tout le fil est marqué lu à la SORTIE de l'onglet, pas au
     défilement. Marquer au défilement compterait comme « lu » ce qui a
     seulement traversé l'écran, et la pastille disparaîtrait sans que
     personne n'ait rien lu. */
  useEffect(() => {
    aMarquer.current = (pubs || []).filter((p) => !p.lu).map((p) => p.id);
  }, [pubs]);

  useEffect(
    () => () => {
      const ids = aMarquer.current;
      if (!ids.length) return;
      apiClient.marquerLues(ids).then(() => onLu?.()).catch(() => {});
    },
    [onLu],
  );

  if (panne) {
    return (
      <div className="app-vide">
        <span className="app-vide__icone">
          <Users size={26} aria-hidden="true" />
        </span>
        <h2 className="app-vide__titre">Fil indisponible</h2>
        <button type="button" className="accueil__reessayer" onClick={charger}>
          Réessayer
        </button>
      </div>
    );
  }

  if (!pubs) return <Spinner size="page" label="Chargement du fil..." />;

  return (
    <section className="fil">
      <p className="fil__intro">
        Écrit par l’équipe, pas par les utilisateurs. Chaque réponse porte son
        niveau de preuve.
      </p>

      <ul className="fil__liste">
        {pubs.map((p) => {
          const deplie = ouvert === p.id;
          return (
            <li key={p.id} className={`post ${p.lu ? '' : 'post--neuf'}`}>
              <button
                type="button"
                className="post__tete"
                aria-expanded={deplie}
                onClick={() => setOuvert(deplie ? null : p.id)}
              >
                <span className="post__etiquettes">
                  {p.epingle && (
                    <span className="post__epingle">
                      <Pin size={11} aria-hidden="true" /> À lire
                    </span>
                  )}
                  <span className="post__cat">{CATEGORIES[p.categorie] || p.categorie}</span>
                  {/* Le niveau de preuve n'est jamais porté par la seule
                      couleur : le mot est écrit, et l'icône double
                      l'avertissement quand ce n'est pas établi. */}
                  <span className={`post__preuve post__preuve--${p.preuve}`}>
                    {p.preuve !== 'etabli' && <CircleAlert size={11} aria-hidden="true" />}
                    {PREUVES[p.preuve] || p.preuve}
                  </span>
                </span>
                <span className="post__titre">{p.titre}</span>
              </button>

              {deplie && (
                <div className="post__corps">
                  {p.corps.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default CommunautePage;
