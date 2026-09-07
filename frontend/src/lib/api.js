/**
 * Grandimi API Client
 * Wrapper for all backend API calls
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

class APIClient {
  constructor(baseURL = API_BASE) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

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
  async createCheckout({ email, userId }) {
    return this.request('/api/v1/checkout', {
      method: 'POST',
      body: JSON.stringify({ email, user_id: userId }),
    });
  }

  /**
   * Source de vérité de l'accès premium : la base, via le backend.
   * Ne jamais se fier au localStorage pour ça — il est modifiable par
   * l'utilisateur en deux clics dans la console.
   */
  async checkPremium(userId) {
    return this.request(`/api/v1/check-premium?user_id=${encodeURIComponent(userId)}`);
  }
}

export const apiClient = new APIClient();

export default apiClient;
