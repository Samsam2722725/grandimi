import { X } from 'lucide-react'

/* Fenêtre « paiement refusé » (23/11/2026, demande de Samuel) : quand la
   banque refuse la carte, un message simple apparaît au milieu de l'écran et
   dit pourquoi, en français ; on le ferme avec la croix. Les textes sont ceux
   de MESSAGES_REFUS (PaywallPage), classés d'après le message de la banque. */
export function RefusPaiement({ titre, texte, carteAdo, onFermer }) {
  return (
    <div className="refus" role="alertdialog" aria-modal="true" aria-label={titre}>
      <div className="refus-carte">
        <button type="button" className="refus-fermer" onClick={onFermer} aria-label="Fermer">
          <X size={24} aria-hidden="true" />
        </button>
        <div className="refus-icone" aria-hidden="true">!</div>
        <h2 className="refus-titre">{titre}</h2>
        <p className="refus-texte">{texte}</p>
        {carteAdo && (
          <p className="refus-ado">
            <strong>Carte ado (Pixpay, Kard, Xaalys…) ?</strong> Active « paiements en ligne » et « paiements à l’étranger » dans son appli, ou demande à un parent de les autoriser.
          </p>
        )}
        <button type="button" className="funnel-cta" onClick={onFermer}>Réessayer</button>
      </div>
    </div>
  )
}

export default RefusPaiement
