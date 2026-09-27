import { Component } from 'react'

/* Sans ce filet, la moindre erreur dans un écran démonte toute l'app et
   laisse une page crème vide — c'est ce qu'a vu le client après s'être
   reconnecté. Ici on garde la main : un message, un bouton pour
   recharger, un autre pour repartir de zéro, et le détail de l'erreur
   en petit pour qu'une capture d'écran suffise à la retrouver. */
class FiletErreur extends Component {
  constructor(props) {
    super(props)
    this.state = { erreur: null }
  }

  static getDerivedStateFromError(erreur) {
    return { erreur }
  }

  componentDidCatch(erreur, info) {
    console.error('Grandimi — écran planté :', erreur, info?.componentStack)
  }

  repartir = () => {
    try {
      localStorage.removeItem('predictionData')
      localStorage.removeItem('grandimi:onboarding-v2')
    } catch {
      // Stockage indisponible : le rechargement suffira.
    }
    window.location.href = '/'
  }

  render() {
    if (!this.state.erreur) return this.props.children

    return (
      <div className="filet-erreur" role="alert">
        <h1>Oups, cet écran n’a pas pu s’afficher</h1>
        <p>
          Recharge la page. Si ça recommence, écris-nous à{' '}
          <a href="mailto:grandimi14@gmail.com?subject=Page%20bloqu%C3%A9e">grandimi14@gmail.com</a>{' '}
          avec une capture de cet écran.
        </p>
        <button type="button" className="filet-erreur-principal" onClick={() => window.location.reload()}>
          Recharger la page
        </button>
        <button type="button" className="filet-erreur-secondaire" onClick={this.repartir}>
          Revenir à l’accueil
        </button>
        <p className="filet-erreur-code">{String(this.state.erreur?.message || this.state.erreur).slice(0, 200)}</p>
      </div>
    )
  }
}

export default FiletErreur
