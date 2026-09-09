import { useState, useEffect } from 'react';
/* design-system-v2.css n'est plus importé ici : il l'est depuis
   index.css, dans @layer base (cf. commentaire là-bas). L'importer
   à nouveau ici le remettrait hors couche. */
import './App.css';
import apiClient from './lib/api';
import { capturePageview } from './lib/analytics';
import HomePage from './pages/HomePage';
import QuestionnaireFlow from './pages/QuestionnaireFlow';
import ResultsPage from './pages/ResultsPage';
import PaywallPage from './pages/PaywallPage';
import GrowthPlanPage from './pages/GrowthPlanPage';
import AuthPage from './pages/AuthPage';
import SetPasswordPage from './pages/SetPasswordPage';
import AdminPage from './pages/AdminPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [predictionData, setPredictionData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

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
      .checkPremium(user.id)
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

  const handleAuthComplete = () => {
    setIsAuthenticated(true);
    setCurrentPage('results');
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
    setFormData(null);
  };

  // Check for Whop payment return - redirect to set password
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.has('checkout_status') && params.get('checkout_status') === 'success') {
      // Sauvegarder email pour SetPasswordPage
      const email = params.get('customer_email');
      if (email) {
        localStorage.setItem('userEmail', email);
      }
      setCurrentPage('set-password');
      // Garder les paramètres URL pour SetPasswordPage
    }
  }, []);

  // Check for admin panel access via URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('admin')) {
      setCurrentPage('admin');
    }
  }, []);

  return (
    <div className="app">
      {/* Public pages */}
      {currentPage === 'home' && (
        <HomePage onStartQuestionnaire={handleStartQuestionnaire} />
      )}

      {currentPage === 'questionnaire' && (
        <QuestionnaireFlow
          onPredictionComplete={handlePredictionComplete}
          onCancel={handleBackHome}
        />
      )}

      {/* Auth pages */}
      {currentPage === 'auth-results' && (
        <AuthPage onAuthComplete={handleAuthComplete} />
      )}

      {/* Set password after payment */}
      {currentPage === 'set-password' && (
        <SetPasswordPage onAuthComplete={handleAuthComplete} />
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
          formData={formData}
          predictionData={predictionData}
          onBackHome={handleBackHome}
        />
      )}

      {/* Admin Panel */}
      {currentPage === 'admin' && <AdminPage />}
    </div>
  );
}

export default App;
