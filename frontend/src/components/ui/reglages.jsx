import { useEffect, useState } from 'react';
import { ChevronLeft, CreditCard, FileText, LineChart, LogOut, Mail, Ruler, Shield, X } from 'lucide-react';

/* Les réglages, copiés de ceux de Taller (le bouton ⚙︎ en haut à droite) :
   mettre à jour ses données, le support, la méthode de prédiction, puis
   confidentialité, conditions et déconnexion. On y ajoute
   l'abonnement, qui chez nous a sa page. */

function Methode() {
  return (
    <div className="reglages-methode">
      <p>Pour estimer ta taille adulte, on utilise :</p>
      <ul className="reglages-puces">
        {['Ta taille et ton poids', 'Ton âge', 'Ton sexe', 'La taille de tes parents', 'Ton sommeil', 'Ton sport', 'Ce que tu manges'].map((x) => <li key={x}>{x}</li>)}
      </ul>
      <p>
        La taille de tes parents et ta taille actuelle pour ton âge pèsent le plus. Le calcul part d’une méthode
        utilisée par les pédiatres, puis compare ta taille à celle des jeunes de ton âge sur les courbes de croissance
        de référence.
      </p>
      <p>
        Tes habitudes (sommeil, sport, alimentation) décident si tu atteins le haut ou le bas de ta fourchette.
        Aucune méthode ne peut prédire ta taille au centimètre près : c’est une estimation, et elle se recalcule
        à chaque nouvelle mesure.
      </p>
    </div>
  );
}

export function Reglages({ onFermer, onMesure, onAbonnement, onDeconnexion }) {
  const [page, setPage] = useState(null);

  useEffect(() => {
    const touche = (e) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [onFermer]);

  const LIGNES = [
    { Icone: Ruler, libelle: 'Mettre à jour ma taille', action: onMesure },
    { Icone: Mail, libelle: 'Contacter le support', lien: 'mailto:bonjour@grandimi.com?subject=Mon%20plan%20Grandimi' },
    { Icone: LineChart, libelle: 'Méthode de prédiction de taille', action: () => setPage('methode') },
    { Icone: CreditCard, libelle: 'Mon abonnement', action: onAbonnement },
  ];

  return (
    <div className="reglages" role="dialog" aria-modal="true" aria-label="Réglages">
      <div className="reglages-haut">
        {page ? (
          <button type="button" className="reglages-bouton-rond" onClick={() => setPage(null)} aria-label="Retour">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        ) : <span />}
        <h2 className="reglages-titre">{page ? 'Notre méthode' : 'Réglages'}</h2>
        <button type="button" className="reglages-bouton-rond" onClick={onFermer} aria-label="Fermer">
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      {page === 'methode' ? <Methode /> : (
        <>
          <ul className="reglages-liste">
            {LIGNES.map(({ Icone, libelle, action, lien }) => (
              <li key={libelle}>
                {lien ? (
                  <a className="reglages-ligne" href={lien}><Icone size={22} aria-hidden="true" />{libelle}</a>
                ) : (
                  <button type="button" className="reglages-ligne" onClick={action}><Icone size={22} aria-hidden="true" />{libelle}</button>
                )}
              </li>
            ))}
            {onDeconnexion && (
              <li>
                <button type="button" className="reglages-ligne reglages-ligne--sortie" onClick={onDeconnexion}>
                  <LogOut size={22} aria-hidden="true" />Se déconnecter
                </button>
              </li>
            )}
          </ul>
          <p className="reglages-pied">
            <a href="/privacy.html"><Shield size={14} aria-hidden="true" /> Confidentialité</a>
            <a href="/cgv.html"><FileText size={14} aria-hidden="true" /> Conditions</a>
          </p>
        </>
      )}
    </div>
  );
}
