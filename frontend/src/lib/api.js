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

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      /* Le corps d'erreur porte parfois plus que du texte : la
         résiliation renvoie une adresse de secours. Ne garder que
         error.error effaçait cette issue avant qu'elle atteigne l'écran. */
      const echec = new Error(error.error || `API Error: ${response.status}`);
      echec.status = response.status;
      echec.details = error;
      throw echec;
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
   *
   * `plan` choisit l'offre ("monthly"/"annual") : le montant réellement
   * facturé est décidé côté serveur par le plan Whop associé, jamais
   * par une valeur envoyée ici.
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
   * Tarifs publics — source unique pour toutes les pages. Éviter que la
   * paywall, le lien parent et "Mon compte" affichent chacun leur propre
   * copie du prix, avec le risque qu'ils divergent un jour.
   */
  async getPlans() {
    return this.request('/api/v1/plans');
  }

  /**
   * Source de vérité de l'accès premium : la base, via le backend.
   * Ne jamais se fier au localStorage pour ça — il est modifiable par
   * l'utilisateur en deux clics dans la console.
   */
  async checkPremium() {
    return this.request('/api/v1/check-premium');
  }

  /**
   * Dit si le dernier paiement de cette adresse était un paiement cadeau
   * (pour le compte d'un enfant) plutôt que pour son propre compte.
   * Appelé juste après le retour de Whop, avant toute création de compte.
   */
  async getCheckoutStatus(email) {
    return this.request(`/api/v1/checkout-status?email=${encodeURIComponent(email)}`);
  }

  /**
   * État premium/mot de passe d'un compte à partir de son seul id, sans
   * session. Permet à l'appareil de l'enfant de découvrir qu'un parent a
   * payé pour lui depuis un autre appareil.
   */
  async getChildStatus(id) {
    return this.request(`/api/v1/child-status?id=${encodeURIComponent(id)}`);
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

  // ---------- Todo-liste quotidienne ----------

  /** Coche/décoche une tâche. Un même appel sert pour les deux sens. */
  async toggleTask(taskKey, date) {
    return this.request('/api/v1/tasks/toggle', {
      method: 'POST',
      body: JSON.stringify({ task_key: taskKey, date }),
    });
  }

  /** Clés des tâches déjà cochées pour une date (aujourd'hui si omise). */
  async getTodayTasks(date) {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request(`/api/v1/tasks/today${qs}`);
  }

  /** Nombre de tâches cochées par jour sur les N derniers jours. */
  async getTaskHistory(days = 30) {
    return this.request(`/api/v1/tasks/history?days=${days}`);
  }

  // ---------- Mon compte / Abonnement ----------

  /** Offre en cours, prochaine date de paiement, état de résiliation. */
  async getSubscription() {
    return this.request('/api/v1/subscription');
  }

  /**
   * Résilie l'abonnement. L'accès reste actif jusqu'à la fin de la
   * période déjà payée — ce n'est jamais une coupure immédiate.
   */
  async cancelSubscription() {
    return this.request('/api/v1/subscription/cancel', { method: 'POST' });
  }
}

export const apiClient = new APIClient();

export default apiClient;
