/**
 * Grandimi API Client
 * Wrapper for all backend API calls
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

class APIClient {
  constructor(baseURL = API_BASE) {
    this.baseURL = baseURL;
  }

  /**
   * Le token de session est joint automatiquement : les routes qui
   * portent des données personnelles répondent désormais sur le compte
   * authentifié et non sur un identifiant passé dans l'URL.
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');

    /* `fetch` ne rejette que sur echec RESEAU, et son message est
       « Failed to fetch » — une chaine du navigateur, en anglais, que
       l'utilisateur voyait telle quelle en bas du questionnaire apres avoir
       rempli quatorze ecrans. On la remplace par une phrase qui dit quoi
       faire. Les erreurs applicatives (4xx/5xx) gardent le message du
       serveur, qui lui est ecrit pour etre lu. */
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
        ...options,
      });
    } catch {
      throw new Error(
        'Connexion impossible. Vérifie ta connexion internet et réessaie — tes réponses sont gardées.',
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Prediction endpoints
  async predictHeightV1(data) {
    return this.request('/api/v1/predict-height', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async predictHeightV2(data) {
    return this.request('/api/v2/predict-height', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Growth plan
  async getGrowthPlan(data) {
    return this.request('/api/v1/growth-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Guides
  async getExerciseGuide(name) {
    return this.request(`/api/v1/exercise-guide?name=${encodeURIComponent(name)}`);
  }

  async getNutritionGuide() {
    return this.request('/api/v1/nutrition-guide');
  }

  async getSleepOptimization() {
    return this.request('/api/v1/sleep-optimization');
  }

  // ---------- Paiement & abonnement ----------

  /**
   * Demande une URL de checkout Whop au backend.
   * Le backend crée l'utilisateur s'il n'existe pas et renvoie
   * { checkout_url }. C'est lui qui connaît le produit Whop : le
   * frontend ne doit jamais construire cette URL lui-même.
   */
  /**
   * `childUserId` n'est renseigné que dans le parcours parent : l'email
   * est alors celui du parent, mais l'accès doit aller au compte de
   * l'enfant. Le backend le transmet à Whop en metadata et le webhook
   * s'en sert pour choisir le bénéficiaire.
   */
  /**
   * `plan` désigne la formule choisie ('mensuel' | 'unique'). Le backend
   * actuel n'expose qu'un produit et ignore ce champ ; il est envoyé dès
   * maintenant pour que l'ajout du paiement unique ne demande aucune
   * modification côté client. Cf. docs/BRIEF-BACKEND.md, point 1.
   */
  async createCheckout({ email, userId, childUserId, plan }) {
    return this.request('/api/v1/checkout', {
      method: 'POST',
      body: JSON.stringify({
        email,
        user_id: userId,
        child_user_id: childUserId,
        plan,
      }),
    });
  }

  /**
   * Source de vérité de l'accès premium : la base, via le backend.
   * Ne jamais se fier au localStorage pour ça — il est modifiable par
   * l'utilisateur en deux clics dans la console.
   */
  async checkPremium() {
    return this.request('/api/v1/check-premium');
  }

  // ---------- Auth ----------

  /**
   * Crée un compte utilisateur avec email et mot de passe
   */
  async signup({ email, password }) {
    return this.request('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * Se connecte avec email et mot de passe
   */
  async login({ email, password }) {
    return this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * Prédictions du compte connecté. L'ancienne signature prenait un
   * email et exposait les mesures de n'importe quel enfant.
   */
  async getMyPredictions() {
    return this.request('/api/user/predictions');
  }
}

export const apiClient = new APIClient();

export default apiClient;
