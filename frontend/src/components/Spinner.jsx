/**
 * Indicateur de chargement unique de l'application.
 *
 * Toute attente — bouton, page entière — passe par ce composant afin que
 * l'utilisateur voie toujours la même icône de chargement (cohérence de la DA).
 *
 * - `inline` : dans un bouton, hérite de la couleur du texte
 * - `page`   : plein écran, accompagné d'un libellé
 */
function Spinner({ size = 'inline', label }) {
  const spinner = (
    <span className={`spinner spinner-${size}`} role="status" aria-live="polite">
      <span className="sr-only">{label || 'Chargement en cours'}</span>
    </span>
  );

  if (size !== 'page') return spinner;

  return (
    <div className="loading-container">
      {spinner}
      <p>{label || 'Chargement en cours...'}</p>
    </div>
  );
}

export default Spinner;
