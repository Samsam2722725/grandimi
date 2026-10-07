import { useState, useEffect, useRef, lazy, Suspense } from 'react';
/* design-system-v2.css n'est plus importé ici : il l'est depuis
   index.css, dans @layer base (cf. commentaire là-bas). L'importer
   à nouveau ici le remettrait hors couche. */
import './App.css';
import apiClient from './lib/api';
import Spinner from './components/Spinner';
import { capturePageview } from './lib/analytics';
/* UNE SEULE PAGE EST CHARGEE TOUT DE SUITE : CELLE QU ON VOIT.

   Les douze pages etaient importees d un bloc, donc empaquetees
   ensemble : un visiteur qui arrive sur l accueil telechargeait le
   questionnaire, la paywall, le plan, l espace parent — et le panneau
   d administration, 444 lignes qu aucun adolescent n ouvrira jamais.
   Mesure avant decoupage : 266 ko compresses, 868 ko reels, a
   telecharger ET a executer avant que le premier pixel s affiche,
   parce que index.html ne contient qu un <div id="root"> vide.

   React.lazy coupe chaque page en morceau separe, charge au moment ou
   elle s affiche. L accueil reste en import direct : la differer
   ajouterait un aller-retour reseau devant le contenu qu on vient
   justement d accelerer. */
import HomePage from './pages/HomePage';

const OnboardingFlow = lazy(() => import('./pages/OnboardingFlow'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const PaywallPage = lazy(() => import('./pages/PaywallPage'));
const GrowthPlanPage = lazy(() => import('./pages/GrowthPlanPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ParentPage = lazy(() => import('./pages/ParentPage'));
const GiftConfirmedPage = lazy(() => import('./pages/GiftConfirmedPage'));
const PlanSetupPage = lazy(() => import('./pages/PlanSetupPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));

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

/* ---------- Raccourci de prévisualisation, DEV UNIQUEMENT ----------

   `?preview=results` ou `?preview=paywall` saute directement à l'écran
   sans repasser par les ~38 questions de l'onboarding. Ajouté après
   plusieurs allers-retours où « va voir localhost » voulait dire refaire
   tout le questionnaire pour vérifier un changement de deux pixels.

   `import.meta.env.DEV` exclut ce chemin du build de production : ce
   n'est pas un mode démo à exposer aux visiteurs, juste un raccourci
   pour ce dépôt en développement. */
const PREVIEW_DATA = {
  age: 14.2,
  sex: 'M',
  profil: 'ado',
  current_height_cm: 165,
  predicted_height_cm: 178,
  potential_height_cm: 181.5,
  confidence_range: { min: 174, max: 182 },
  confidence_level: 'medium',
  percentile_age: 62,
  sleep_hours_per_night: 7,
  exercise_min_per_day: 20,
  nutrition_level: 'fair',
  taille_reve: 183,
  out_of_domain: false,
  warning: null,
  email: 'preview@grandimi.dev',
  user_id: 'preview-user',
  model_used: 'Khamis-Roche + percentile OMS — preview',
};

function pagePreviewDemandee(params) {
  if (!import.meta.env.DEV) return null;
  const valeur = params.get('preview');
  const pages = {
    results: 'results',
    paywall: 'paywall',
    plan: 'plan',
    reglage: 'plan-setup',
    'mot-de-passe': 'set-password',
  };
  return pages[valeur] ?? null;
}

/* Le jeton de session vaut « idCompte.expiration.signature ». On le lit
   pour savoir s'il est encore valable et s'il appartient au bon compte :
   un jeton expiré, ou celui d'un frère connecté sur le téléphone familial,
   ne doit pas faire sauter l'écran du mot de passe. */
function jetonValidePour(idCompte) {
  const [idJeton, expiration] = (localStorage.getItem('token') || '').split('.');
  if (!idJeton || !(Number(expiration) * 1000 > Date.now())) return false;
  return !idCompte || idJeton === idCompte;
}

function App() {
  /* Un client qui revient de Whop voyait la page d'accueil marchande le
     temps que la vérification d'achat réponde — soit jusqu'à une minute
     quand l'API dort (offre gratuite Render). Il venait de payer et on
     lui revendait le produit, sans rien indiquer. Cet écran d'attente
     est choisi dès le premier rendu, avant toute peinture, pour qu'il
     n'y ait pas non plus de clignotement. */
  const [currentPage, setCurrentPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = pagePreviewDemandee(params);
    if (preview) return preview;
    // `?step=xxx` (dev only, lu par OnboardingFlow) saute direct à un écran
    // de l'onboarding : encore faut-il que l'app affiche l'onboarding.
    if (import.meta.env.DEV && params.has('step')) return 'questionnaire';
    return retourDePaiementReussi(params) ? 'paiement' : 'home';
  });
  const [predictionData, setPredictionData] = useState(() => {
    const preview = pagePreviewDemandee(new URLSearchParams(window.location.search));
    if (!preview) return null;
    // PaywallPage relit `predictionData` et `userEmail` depuis localStorage
    // directement (elle ne les reçoit pas en props) : le raccourci doit donc
    // écrire au même endroit que handlePredictionComplete, pas seulement
    // poser l'état React.
    localStorage.setItem('predictionData', JSON.stringify(PREVIEW_DATA));
    localStorage.setItem('userEmail', PREVIEW_DATA.email);
    return PREVIEW_DATA;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // L'aperçu du plan (dev) doit passer la garde `isPaid` du rendu.
  const [isPaid, setIsPaid] = useState(
    () => pagePreviewDemandee(new URLSearchParams(window.location.search)) === 'plan',
  );
  // Compte enfant à créditer quand un parent arrive par le lien partagé.
  const [parentChildUserId, setParentChildUserId] = useState(null);
  // Paiement parent : l'accès de l'enfant est-il confirmé par le serveur ?
  const [giftConfirme, setGiftConfirme] = useState(true);

  // Une vue par écran : l'URL ne change jamais dans cette SPA,
  // donc PostHog ne peut pas la déduire tout seul.
  useEffect(() => {
    capturePageview(currentPage);
  }, [currentPage]);

  /* Réveil du serveur. Render (offre gratuite) s'endort après 15 min sans
     visite et met jusqu'à une minute à repartir : c'est ce qui rendait la
     fin de l'analyse et le bouton du paywall si lents. On l'appelle dès
     l'ouverture du site, après l'affichage ; le temps de faire le
     questionnaire, il est réveillé. */
  useEffect(() => {
    const reveiller = () => apiClient.healthCheck().catch(() => {});
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(reveiller, { timeout: 4000 })
      : setTimeout(reveiller, 1500);
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, []);

  /* Calcul en attente : l'analyse a échoué (serveur, limite, réseau) mais
     on a laissé passer vers les résultats et le paywall. On le relance ici
     toutes les 20 s, discrètement, jusqu'à obtenir la vraie prédiction et
     l'identifiant du compte — avant que le plan payant en ait besoin. */
  /* Bornée : une réponse refusée par le serveur (400 : valeur hors limites)
     ne se corrige pas en réessayant — on arrête. Les autres échecs sont
     retentés de plus en plus espacés, 5 fois au plus. Une relance toutes
     les 20 s sans fin épuisait la limite de calculs de toute la connexion
     (wifi familial, lycée) pour les autres visiteurs. */
  useEffect(() => {
    if (!predictionData?.prediction_en_attente || !predictionData.payload_prediction) return undefined;
    let annule = false;
    let minuterie;
    let essai = 0;
    const DELAIS = [3000, 20000, 60000, 180000, 300000];
    const essayer = async () => {
      try {
        const res = await apiClient.predictHeightV2(predictionData.payload_prediction);
        if (annule) return;
        const complet = { ...predictionData, ...res, prediction_en_attente: false };
        setPredictionData(complet);
        localStorage.setItem('predictionData', JSON.stringify(complet));
        if (res.user_id) {
          // Le compte de CETTE analyse, pas celui d'une analyse précédente
          // faite sur le même téléphone (frère, sœur, autre adresse).
          const utilisateur = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem(
            'user',
            JSON.stringify({ ...utilisateur, id: res.user_id, email: complet.email }),
          );
        }
      } catch (err) {
        if (annule) return;
        const refusDefinitif = err && err.status >= 400 && err.status < 500 && err.status !== 429;
        essai += 1;
        if (!refusDefinitif && essai < DELAIS.length) {
          minuterie = setTimeout(essayer, DELAIS[essai]);
        }
      }
    };
    minuterie = setTimeout(essayer, DELAIS[0]);
    return () => {
      annule = true;
      clearTimeout(minuterie);
    };
  }, [predictionData]);

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

  // Accueil : le choix Garçon / Fille est la première question. On
  // démarre un questionnaire neuf avec le sexe déjà rempli.
  const [sexeDepart, setSexeDepart] = useState(null);
  const handleStartQuestionnaire = (sexe) => {
    setSexeDepart(sexe === 'M' || sexe === 'F' ? sexe : null);
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
    } else if (!localStorage.getItem('token')) {
      /* Analyse « en attente » (pas encore d'identifiant) sur un téléphone
         qui a déjà servi : l'ancien identifiant appartient à quelqu'un
         d'autre. Le garder enverrait le paiement et le lien parent sur le
         mauvais compte ; la relance en arrière-plan posera le bon. */
      try {
        const utilisateur = JSON.parse(localStorage.getItem('user') || '{}');
        const autreAdresse =
          utilisateur.email &&
          String(utilisateur.email).trim().toLowerCase() !== String(data.email || '').trim().toLowerCase();
        if (autreAdresse) delete utilisateur.id;
        localStorage.setItem('user', JSON.stringify({ ...utilisateur, email: data.email }));
      } catch {
        localStorage.removeItem('user');
      }
    }

    setCurrentPage('results');
  };

  /* Le plan ne s’ouvre qu’une fois ses horaires connus.

     Sans ce détour, le plan annonçait « 10:00 PM » et « 7:00 AM » à
     tout le monde — écrit en dur côté serveur, en anglais, sur un
     site français. Cinq questions posées une seule fois suffisent à
     poser des heures réelles ; `renseignees` dit si elles l’ont déjà
     été.

     Une lecture qui échoue N’EMPÊCHE PAS d’accéder au plan : on ne
     laisse pas quelqu’un qui vient de payer devant un écran de
     réglage cassé. Il obtient son plan, avec les horaires par
     défaut, et pourra le régler plus tard. */
  const ouvrirPlan = async () => {
    try {
      const prefs = await apiClient.getPreferences();
      setCurrentPage(prefs?.renseignees ? 'plan' : 'plan-setup');
    } catch {
      setCurrentPage('plan');
    }
  };

  const handleViewPlan = () => {
    if (!isPaid) {
      // Analyse toujours « en attente » : on relance le calcul (nouvel
      // objet = nouveau cycle d'essais), pour que l'identifiant du compte
      // soit là avant un paiement ou un lien parent.
      if (predictionData?.prediction_en_attente) setPredictionData({ ...predictionData });
      setCurrentPage('paywall');
      return;
    }
    ouvrirPlan();
  };

  const handleGoToAccount = () => {
    setCurrentPage('account');
  };

  const handleAuthComplete = async () => {
    setIsAuthenticated(true);

    /* AuthPage vient d'écrire la dernière prédiction dans le localStorage,
       mais l'état React ne la relisait pas : après « Accueil » (qui le
       vide), « Se connecter » menait à un écran de résultats sans données,
       donc à une page blanche. On la relit, et un abonné va droit à son
       plan plutôt qu'à l'écran qui lui vend ce qu'il a déjà. */
    let donnees = null;
    try {
      donnees = JSON.parse(localStorage.getItem('predictionData') || 'null');
    } catch {
      donnees = null;
    }
    if (donnees) setPredictionData(donnees);

    try {
      const res = await apiClient.checkPremium();
      setIsPaid(Boolean(res.is_premium));
      if (res.is_premium && donnees) {
        await ouvrirPlan();
        return;
      }
    } catch {
      // Réseau : on retombe sur les résultats ou l'accueil ci-dessous.
    }
    setCurrentPage(donnees ? 'results' : 'home');
  };


  /* Après création du mot de passe, on DEMANDE au serveur si le
     compte est premium au lieu de le supposer.

     L'ancienne version posait isPaid(true) et envoyait droit sur le
     plan. Quand le compte crédité n'était pas celui-là, le client
     venait de payer et tombait sur un « abonnement requis » sec,
     sans explication et sans issue — c'est ce qu'on a vu trois fois
     en production le 12/09/2026.

     On réessaie quelques secondes : le webhook Whop arrive parfois
     après le retour du client, et un accès qui met deux secondes à
     s'ouvrir ne doit pas se lire comme un refus. */
  const handlePaymentComplete = async () => {
    setIsAuthenticated(true);
    // Écran d'attente pendant la vérification (jusqu'à 30 s) : sans lui, le
    // formulaire restait affiché et le client revalidait (« compte existe déjà »).
    setCurrentPage('paiement');
    // La prédiction reconstruite par l'écran mot de passe est dans le
    // navigateur : on la recharge, sinon le plan renvoyait sur « Mon compte ».
    try {
      const donnees = JSON.parse(localStorage.getItem('predictionData') || 'null');
      if (donnees) setPredictionData(donnees);
    } catch {
      // illisible : on continue
    }

    // Jusqu'à ~30 s : au-delà de 10 s de retard du webhook Whop, le client
    // lisait « pas d'abonnement » alors qu'il venait de payer.
    for (let essai = 0; essai < 10; essai += 1) {
      try {
        const res = await apiClient.checkPremium();
        if (res.is_premium) {
          setIsPaid(true);
          await ouvrirPlan();
          return;
        }
      } catch (err) {
        // Jeton refusé (expiré) : inutile d'insister, on fait se reconnecter.
        if (err && err.status === 401) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setCurrentPage('auth');
          return;
        }
        // Réseau : on retente, le compte est peut-être déjà crédité.
      }
      await new Promise((resoudre) => setTimeout(resoudre, 3000));
    }

    /* Toujours rien après trente secondes : on l'envoie sur « Mon compte »,
       qui lui montre l'état réel de son abonnement et le lien Whop,
       plutôt que sur un écran de plan qui répondra 402. */
    setIsPaid(false);
    setCurrentPage('account');
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

  /* Chaque écran ne s'affiche que si ses données sont là (résultats et
     plan : une prédiction ; compte : une session). Quand l'une manquait,
     rien ne s'affichait : une page crème vide, sans issue. On renvoie
     plutôt vers un écran qui peut s'afficher. */
  useEffect(() => {
    if (['results', 'plan', 'paywall'].includes(currentPage) && !predictionData) {
      setCurrentPage(isAuthenticated ? 'account' : 'home');
    } else if (currentPage === 'plan' && !isPaid) {
      setCurrentPage('paywall');
    } else if (currentPage === 'account' && !isAuthenticated) {
      setCurrentPage('auth');
    }
  }, [currentPage, predictionData, isAuthenticated, isPaid]);

  /* On ne vide plus l'analyse en revenant à l'accueil : l'accueil propose
     « Reprendre mon analyse ». La vider obligeait à refaire les 33 écrans
     pour revoir son résultat et payer. */
  const handleBackHome = () => {
    setCurrentPage('home');
  };

  const handleReprendre = () => {
    if (isPaid && predictionData) {
      ouvrirPlan();
      return;
    }
    setCurrentPage(predictionData ? 'results' : 'home');
  };

  /* Bouton / geste « retour » du téléphone. L'adresse ne change jamais
     dans ce site : sans ceci, « retour » faisait quitter le site à
     n'importe quelle étape (et renvoyait sur TikTok). Une entrée
     d'historique « garde » est posée ; « retour » la consomme, on recule
     d'un écran dans le site, et on la repose. Sur l'accueil, on laisse
     partir. */
  const pageRef = useRef(currentPage);
  pageRef.current = currentPage;
  useEffect(() => {
    const SANS_RETOUR = ['paiement', 'set-password', 'plan-setup', 'admin'];
    const LAISSER_PARTIR = ['home', 'parent', 'gift-confirmed'];
    const surRetour = (e) => {
      const page = pageRef.current;
      if (LAISSER_PARTIR.includes(page)) {
        // On ne sort que si l'on vient de consommer la garde (on est sur
        // l'entrée d'origine) : un retour depuis une ancre (#faq) reste
        // sur la page. Le parent arrivé par WhatsApp peut y retourner.
        if (e.state && e.state.grandimi === 'origine') window.history.back();
        return;
      }
      // Une adresse de retour de paiement restée sur l'entrée d'origine ne
      // doit pas réapparaître (rechargement = nouvel écran de paiement).
      if (page !== 'paiement' && retourDePaiementReussi(new URLSearchParams(window.location.search))) {
        window.history.replaceState(window.history.state, '', window.location.pathname);
      }
      window.history.pushState({ grandimi: true }, '');
      if (SANS_RETOUR.includes(page)) return;
      if (page === 'questionnaire') {
        window.dispatchEvent(new CustomEvent('grandimi:retour'));
      } else if (page === 'paywall') {
        setCurrentPage('results');
      } else {
        setCurrentPage('home');
      }
    };
    window.history.replaceState({ grandimi: 'origine' }, '');
    window.history.pushState({ grandimi: true }, '');
    window.addEventListener('popstate', surRetour);
    return () => window.removeEventListener('popstate', surRetour);
  }, []);

  // Garde manquante (vue TikTok neuve, retour depuis le cache) : on la
  // repose dès qu'on quitte l'accueil, sinon « retour » fermerait le site
  // en plein questionnaire.
  useEffect(() => {
    if (currentPage !== 'home' && window.history.state?.grandimi !== true) {
      window.history.pushState({ grandimi: true }, '');
    }
  }, [currentPage]);

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
      let annule = false;

      /* On RÉCLAME le paiement avant tout le reste.

         L'accès était rattaché par l'adresse e-mail : celle tapée sur la
         page Whop devait être identique à celle tapée dans le
         questionnaire. Whop laisse ce champ modifiable, personne ne
         retape deux fois la même chose, et le client se retrouvait avec
         deux comptes — le premium sur celui de Whop, lui sur l'autre.

         L'identifiant de paiement, lui, est le même des deux côtés :
         Whop le met dans l'URL de retour et l'envoie au serveur dans un
         webhook signé. Il n'y a plus rien à retaper. */
      /* Quel compte doit recevoir l'accès ?

         « grandimi:paiement_pour » est posé par l'écran parent : il
         porte l'identifiant de l'ENFANT. Il passe avant le compte local,
         parce que sur le téléphone du parent le compte local est soit
         absent, soit le sien — et c'est l'enfant qui doit être crédité.

         Il est retiré aussitôt lu : sans ça, le prochain paiement fait
         depuis ce même navigateur irait encore sur le compte de
         l'enfant. */
      let estCadeau = false;
      const idCompte = (() => {
        try {
          const pour = localStorage.getItem('grandimi:paiement_pour');
          if (pour) {
            localStorage.removeItem('grandimi:paiement_pour');
            estCadeau = true;
            return pour;
          }
          return JSON.parse(localStorage.getItem('user') || '{}').id || '';
        } catch {
          return '';
        }
      })();
      const idPaiement = params.get('payment_id') || params.get('receipt_id') || '';

      const reclamer = async () => {
        if (!idPaiement || !idCompte) return false;
        /* Le client revient parfois avant le webhook de Whop. « pending »
           n'est donc pas un échec : on redemande pendant une quinzaine de
           secondes avant de laisser tomber. */
        // Paiement parent : rien ne réessaiera après cet écran, on attend ~60 s.
        const essaisMax = estCadeau ? 24 : 6;
        for (let essai = 0; essai < essaisMax && !annule; essai += 1) {
          try {
            const res = await apiClient.reclamerPaiement({
              paymentId: idPaiement,
              userId: idCompte,
            });
            if (res.status === 'granted' || res.status === 'already_granted') return true;
          } catch {
            // Réseau : on retente.
          }
          await new Promise((resoudre) => setTimeout(resoudre, 2500));
        }
        return false;
      };

      const versMotDePasse = () => {
        if (annule) return;
        // Déjà connecté (réabonnement, ou onglet rechargé après avoir
        // choisi son mot de passe) : pas de second mot de passe, on vérifie
        // l'accès directement. Sinon le serveur répondait « un compte
        // existe déjà », sans issue.
        if (jetonValidePour(idCompte)) {
          handlePaymentComplete();
          return;
        }
        setCurrentPage('set-password');
      };

      // L'adresse de Whop (customer_email) sert à l'écran mot de passe :
      // on la garde avant de nettoyer l'adresse de la page.
      const emailWhop = params.get('customer_email');
      if (emailWhop) sessionStorage.setItem('grandimi:email_whop', emailWhop);

      (async () => {
        const accorde = await reclamer();
        if (annule) return;

        /* L'adresse « ?status=success&payment_id=… » restait affichée : à
           chaque rechargement (Safari recharge souvent les onglets), le
           client retombait sur « choisis un mot de passe » et une erreur.
           On l'efface une fois le retour traité. */
        window.history.replaceState(window.history.state, '', window.location.pathname);

        /* Paiement parent : on sait de source sûre que le payeur n'est
           pas le bénéficiaire — c'est son propre navigateur qui l'a noté
           avant de partir chez Whop. On l'envoie donc directement sur
           l'écran de confirmation, sans interroger le serveur.

           L'ancienne détection passait par /checkout-status, qui devine
           le cas cadeau à partir de l'adresse du payeur. Une devinette
           de moins sur le chemin qui compte le plus : un parent à qui on
           proposerait de « créer son mot de passe » ouvrirait un compte
           fantôme pendant que l'accès de l'enfant, lui, est déjà prêt. */
        if (estCadeau) {
          setGiftConfirme(accorde);
          setCurrentPage('gift-confirmed');
          return;
        }

        const email = params.get('customer_email');

        /* Sans adresse dans l'URL, il ne reste que ce qu'on a en local :
           l'écran de mot de passe s'en charge. */
        if (!email) {
          versMotDePasse();
          return;
        }

        /* Paiement cadeau : le payeur n'est pas le bénéficiaire, il ne
           doit surtout pas se voir proposer de créer un compte. On ne
           bloque pas un vrai payeur derrière une panne réseau : en cas
           d'échec on l'envoie quand même vers son mot de passe. */
        try {
          const res = await apiClient.getCheckoutStatus(email);
          if (annule) return;
          if (res.gift) {
            setCurrentPage('gift-confirmed');
            return;
          }
        } catch {
          // Statut illisible : on continue vers le mot de passe.
        }

        versMotDePasse();
      })();

      return () => {
        annule = true;
      };
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
      {/* Le temps qu un morceau de page arrive, on montre le meme
          indicateur que partout ailleurs. Sur une connexion correcte il
          n apparait pas : le morceau fait quelques dizaines de ko. */}
      <Suspense fallback={<Spinner size="page" label="Chargement..." />}>
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
          onReprendre={handleReprendre}
          analyseEnCours={Boolean(predictionData)}
          abonne={isPaid && Boolean(predictionData)}
        />
      )}

      {currentPage === 'questionnaire' && (
        <OnboardingFlow
          sexeDepart={sexeDepart}
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
        <SetPasswordPage onAuthComplete={handlePaymentComplete} onSeConnecter={handleLogin} />
      )}

      {/* Paiement cadeau confirmé : le payeur n'est pas le bénéficiaire,
          aucun compte n'est créé ici. */}
      {currentPage === 'plan-setup' && (
        <PlanSetupPage onTermine={() => setCurrentPage('plan')} />
      )}

      {currentPage === 'gift-confirmed' && (
        <GiftConfirmedPage onBackHome={handleBackHome} confirme={giftConfirme} />
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
        <PaywallPage onBackHome={() => setCurrentPage('results')} />
      )}

      {/* Growth Plan (after payment) */}
      {currentPage === 'plan' && predictionData && isPaid && (
        <GrowthPlanPage
          predictionData={predictionData}
          onBackHome={handleBackHome}
          onGoToAccount={handleGoToAccount}
          onMiseAJourPrediction={(nouvelles) => {
            // Nouvelle mesure → estimation recalculée : on la garde comme
            // la prédiction courante, au même endroit que la première.
            setPredictionData(nouvelles);
            localStorage.setItem('predictionData', JSON.stringify(nouvelles));
          }}
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
      </Suspense>
    </div>
  );
}

export default App;
