import { useState, useEffect } from 'react';
/* design-system-v2.css n'est plus importé ici : il l'est depuis
   index.css, dans @layer base (cf. commentaire là-bas). L'importer
   à nouveau ici le remettrait hors couche. */
import './App.css';
import apiClient from './lib/api';
import Spinner from './components/Spinner';
import { capturePageview } from './lib/analytics';
import HomePage from './pages/HomePage';
import QuestionnaireFlow from './pages/QuestionnaireFlow';
import ResultsPage from './pages/ResultsPage';
import PaywallPage from './pages/PaywallPage';
import GrowthPlanPage from './pages/GrowthPlanPage';
import AuthPage from './pages/AuthPage';
import SetPasswordPage from './pages/SetPasswordPage';
import AdminPage from './pages/AdminPage';
import ParentPage from './pages/ParentPage';
import GiftConfirmedPage from './pages/GiftConfirmedPage';
import AccountPage from './pages/AccountPage';

/* Reconnaît un retour de paiement Whop.

   L'adresse de retour se règle dans le tableau de bord Whop (« Redirect
   after checkout »), pas dans ce dépôt : rien ici ne peut garantir sa
   forme. Whop ajoute son propre `status=success`, alors que ce code
   n'acceptait que `checkout_status=success`. Un retour configuré
   simplement sur https://grandimi.com/ arrivait donc avec le seul
   `status=success` : le client venait de payer, atterrissait sur la page
   d'accueil comme un visiteur, et ne voyait jamais l'écran qui lui donne
   accès à ce qu'il a acheté.

   Les deux formes sont désormais reconnues. */
function retourDePaiementReussi(params) {
  return (
    params.get('checkout_status') === 'success' || params.get('status') === 'success'
  );
}

/* Un retour de paiement ne doit pas être confondu avec une visite
   ordinaire par les effets qui suivent. */
function estUnRetourDePaiement(params) {
  return params.has('checkout_status') || params.has('status');
}

function App() {
  /* Un client qui revient de Whop voyait la page d'accueil marchande le
     temps que la vérification d'achat réponde — soit jusqu'à une minute
     quand l'API dort (offre gratuite Render). Il venait de payer et on
     lui revendait le produit, sans rien indiquer. Cet écran d'attente
     est choisi dès le premier rendu, avant toute peinture, pour qu'il
     n'y ait pas non plus de clignotement. */
  const [currentPage, setCurrentPage] = useState(() =>
    retourDePaiementReussi(new URLSearchParams(window.location.search))
      ? 'paiement'
      : 'home',
  );
  const [predictionData, setPredictionData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  // Compte enfant à créditer quand un parent arrive par le lien partagé.
  const [parentChildUserId, setParentChildUserId] = useState(null);

  // Une vue par écran : l'URL ne change jamais dans cette SPA,
  // donc PostHog ne peut pas la déduire tout seul.
  useEffect(() => {
    capturePageview(currentPage);
  }, [currentPage]);

  // Récupère les données de prédiction sauvegardées
  useEffect(() => {
    const savedPredictionData = localStorage.getItem('predictionData');
    if (savedPredictionData) {
      try {
        setPredictionData(JSON.parse(savedPredictionData));
      } catch {
        localStorage.removeItem('predictionData');
      }
    }
  }, []);

  // Vérifie la session au montage.
  //
  // L'accès premium est demandé AU SERVEUR, jamais déduit du
  // localStorage : celui-ci est modifiable en deux clics dans la
  // console, et la version précédente accordait le plan complet à
  // quiconque écrivait `subscription` dedans.
  useEffect(() => {
    const brut = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!brut || !token) return;

    let user;
    try {
      user = JSON.parse(brut);
    } catch {
      localStorage.removeItem('user');
      return;
    }

    setIsAuthenticated(true);

    if (!user.id) return;

    let annule = false;
    apiClient
      .checkPremium()
      .then((res) => {
        if (!annule) setIsPaid(Boolean(res.is_premium));
      })
      .catch(() => {
        // En cas d'échec réseau on reste non-premium : mieux vaut
        // refuser à tort que d'ouvrir l'accès à tort.
        if (!annule) setIsPaid(false);
      });

    return () => {
      annule = true;
    };
  }, []);

  const handleStartQuestionnaire = () => {
    setCurrentPage('questionnaire');
  };

  const handlePredictionComplete = (data) => {
    setPredictionData(data);
    localStorage.setItem('predictionData', JSON.stringify(data));
    // Sauvegarder l'email du questionnaire pour la paywall
    if (data.email) {
      localStorage.setItem('userEmail', data.email);
    }

    /* L'id du compte créé par la prédiction sert à construire le lien de
       paiement destiné au parent. Il n'était nulle part : `user` n'est
       écrit qu'à la connexion, or on arrive ici sans compte. */
    if (data.user_id) {
      const utilisateur = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem(
        'user',
        JSON.stringify({ ...utilisateur, id: data.user_id, email: data.email }),
      );
    }

    /* Le resultat s'affiche SANS compte.
       La landing promet "Estimation gratuite - sans compte" et "aucun
       resultat floute" ; envoyer l'utilisateur sur un mur de connexion
       juste apres les 5 etapes contredisait la promesse au moment precis
       ou il attend sa reponse. Le compte n'est demande que plus loin,
       pour acceder au plan payant. */
    setCurrentPage('results');
  };

  const handleViewPlan = () => {
    if (!isPaid) {
      setCurrentPage('paywall');
    } else {
      setCurrentPage('plan');
    }
  };

  const handleGoToAccount = () => {
    setCurrentPage('account');
  };

  const handleAuthComplete = () => {
    setIsAuthenticated(true);
    /* Sans ceci, isPaid restait figé à sa valeur d'avant connexion : un
       enfant qui crée son mot de passe à la main (plutôt que via la
       redirection automatique après paiement) semblait non-premium et
       retombait sur la paywall, alors que son compte l'était déjà. */
    apiClient
      .checkPremium()
      .then((res) => setIsPaid(Boolean(res.is_premium)))
      .catch(() => {});
    setCurrentPage('results');
  };

  const handlePaymentComplete = () => {
    setIsAuthenticated(true);
    setIsPaid(true);
    setCurrentPage('plan');
  };

  /* handlePaymentComplete a été retiré : accorder le premium depuis le
     client était précisément la faille. C'est désormais le webhook Whop
     qui met à jour is_premium en base, et checkPremium qui fait foi. */

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setIsPaid(false);
    setCurrentPage('home');
    setPredictionData(null);
  };

  const handleBackHome = () => {
    setCurrentPage('home');
    setPredictionData(null);
  };

  const handleLogin = () => {
    setCurrentPage('auth');
  };

  /* Retour de paiement Whop. customer_email est TOUJOURS celui du payeur —
     pour un parent réglant depuis le lien partagé, c'est SA propre adresse,
     alors que l'accès a été appliqué au compte de l'enfant. Sans cette
     vérification, on poussait n'importe quel payeur vers "Créez votre mot
     de passe" à sa propre adresse : un compte fantôme, jamais premium,
     pendant que le compte réellement crédité ne recevait jamais la
     moindre invite à se connecter. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (retourDePaiementReussi(params)) {
      const email = params.get('customer_email');
      if (!email) {
        setCurrentPage('set-password');
        return;
      }

      /* fetch() n'a pas de délai maximum : une requête restée en suspens
         ne déclenche ni .then ni .catch, et laisserait le payeur devant
         l'écran d'attente sans fin. Passé quinze secondes, on applique
         la même issue que le .catch ci-dessous. Le minuteur est annulé
         dès qu'une réponse arrive, pour ne pas écraser le cas cadeau —
         où l'adresse du payeur n'est justement pas celle du compte. */
      const versMotDePasse = () => {
        localStorage.setItem('userEmail', email);
        setCurrentPage('set-password');
      };
      const secours = setTimeout(versMotDePasse, 15000);

      apiClient
        .getCheckoutStatus(email)
        .then((res) => {
          clearTimeout(secours);
          if (res.gift) {
            setCurrentPage('gift-confirmed');
          } else {
            versMotDePasse();
          }
        })
        .catch(() => {
          // Statut illisible : on ne bloque pas un vrai payeur derrière
          // une panne réseau, quitte à risquer (rarement) un compte
          // fantôme plutôt qu'un paiement sans suite du tout.
          clearTimeout(secours);
          versMotDePasse();
        });

      return () => clearTimeout(secours);
    }
  }, []);

  /* Parcours enfant, second appareil : un parent a pu payer depuis SON
     propre téléphone, jamais celui de l'enfant. C'est donc l'appareil de
     l'enfant — qui a gardé l'id de son compte depuis le questionnaire
     gratuit — qui doit découvrir tout seul que l'accès est prêt et qu'il
     ne lui reste qu'à choisir un mot de passe pour l'utiliser. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (estUnRetourDePaiement(params) || params.has('admin') || params.has('parent')) {
      return;
    }

    let idConnu;
    try {
      idConnu = JSON.parse(localStorage.getItem('user') || '{}').id;
    } catch {
      idConnu = null;
    }
    if (!idConnu || localStorage.getItem('token')) return;

    apiClient
      .getChildStatus(idConnu)
      .then((res) => {
        if (res.is_premium && !res.has_password) {
          setCurrentPage('set-password');
        }
      })
      .catch(() => {});
  }, []);

  // Check for admin panel access via URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('admin')) {
      setCurrentPage('admin');
    }
  }, []);

  /* Lien de paiement partagé par l'enfant : ?parent=<id du compte enfant>.
     Le parent n'a ni compte ni questionnaire, cet écran doit donc
     s'afficher sans dépendre de predictionData ni d'une session. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idEnfant = params.get('parent');
    if (idEnfant) {
      setParentChildUserId(idEnfant);
      setCurrentPage('parent');
    }
  }, []);

  return (
    <div className="app">
      {currentPage === 'paiement' && (
        <div className="account-page">
          <Spinner size="page" label="Paiement confirmé — on prépare ton accès..." />
        </div>
      )}

      {/* Public pages */}
      {currentPage === 'home' && (
        <HomePage
          onStartQuestionnaire={handleStartQuestionnaire}
          onLogin={handleLogin}
        />
      )}

      {currentPage === 'questionnaire' && (
        <QuestionnaireFlow
          onPredictionComplete={handlePredictionComplete}
          onCancel={handleBackHome}
        />
      )}

      {/* Auth pages */}
      {currentPage === 'auth' && (
        <AuthPage onAuthComplete={handleAuthComplete} />
      )}

      {currentPage === 'auth-results' && (
        <AuthPage onAuthComplete={handleAuthComplete} />
      )}

      {/* Set password after payment */}
      {currentPage === 'set-password' && (
        <SetPasswordPage onAuthComplete={handlePaymentComplete} />
      )}

      {/* Paiement cadeau confirmé : le payeur n'est pas le bénéficiaire,
          aucun compte n'est créé ici. */}
      {currentPage === 'gift-confirmed' && (
        <GiftConfirmedPage onBackHome={handleBackHome} />
      )}

      {/* Results (visible after auth) */}
      {currentPage === 'results' && predictionData && (
        <ResultsPage
          predictionData={predictionData}
          onViewPlan={handleViewPlan}
          onBackHome={handleBackHome}
        />
      )}

      {/* Paywall (before plan access) */}
      {/* La paywall redirige vers Whop : l'accès n'est plus accordé
          côté client, mais par le webhook après paiement réel. */}
      {currentPage === 'paywall' && predictionData && (
        <PaywallPage onBackHome={handleBackHome} />
      )}

      {/* Growth Plan (after payment) */}
      {currentPage === 'plan' && predictionData && isPaid && (
        <GrowthPlanPage
          predictionData={predictionData}
          onBackHome={handleBackHome}
          onGoToAccount={handleGoToAccount}
        />
      )}

      {/* Mon compte -> Abonnement : offre en cours, prochain paiement, résiliation. */}
      {currentPage === 'account' && isAuthenticated && (
        <AccountPage onBackHome={handleBackHome} />
      )}

      {/* Paiement par un parent, via le lien partagé */}
      {currentPage === 'parent' && (
        <ParentPage childUserId={parentChildUserId} />
      )}

      {/* Admin Panel */}
      {currentPage === 'admin' && <AdminPage />}
    </div>
  );
}

export default App;
