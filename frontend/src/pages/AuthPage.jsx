import { useState } from 'react';
import Spinner from '../components/Spinner';
import '../styles/auth-page.css';

function AuthPage({ onAuthComplete }) {
  const [mode, setMode] = useState('login'); // login, signup, forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simulated auth - would call real backend
      if (mode === 'login') {
        if (!email || !password) throw new Error('Email et mot de passe requis');
        // Simulate login
        localStorage.setItem('user', JSON.stringify({ email, role: 'user' }));
        localStorage.setItem('token', 'fake-jwt-token-' + Date.now());
      } else if (mode === 'signup') {
        if (!name || !email || !password) throw new Error('Tous les champs requis');
        // Simulate signup
        localStorage.setItem('user', JSON.stringify({ email, name, role: 'user' }));
        localStorage.setItem('token', 'fake-jwt-token-' + Date.now());
      }

      setLoading(false);
      onAuthComplete();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <path d="M16 8V24M8 16H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Grandimi</span>
        </div>

        <div className="auth-card">
          {mode === 'login' && (
            <>
              <h1>Se connecter</h1>
              <p className="subtitle">Accède à tes résultats et ton plan</p>

              <form onSubmit={handleSubmit} className="auth-form">
                {error && (
                  <div className="alert alert-error">
                    <span className="alert-icon">✕</span>
                    <div>{error}</div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="toi@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Mot de passe</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary btn-full" disabled={loading}>
                  {loading ? <><Spinner />Connexion...</> : 'Se connecter'}
                </button>
              </form>

              <div className="auth-footer">
                <p>Pas de compte ? <button className="btn-tertiary" onClick={() => setMode('signup')}>Créer un compte</button></p>
                <button className="btn-tertiary" onClick={() => setMode('forgot')}>Mot de passe oublié ?</button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h1>Créer un compte</h1>
              <p className="subtitle">Sauvegarde ton plan personnalisé</p>

              <form onSubmit={handleSubmit} className="auth-form">
                {error && (
                  <div className="alert alert-error">
                    <span className="alert-icon">✕</span>
                    <div>{error}</div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="name">Prénom</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ton prénom"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="toi@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Mot de passe</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 caractères"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary btn-full" disabled={loading}>
                  {loading ? <><Spinner />Création du compte...</> : 'Créer mon compte'}
                </button>
              </form>

              <div className="auth-footer">
                <p>Déjà un compte ? <button className="btn-tertiary" onClick={() => setMode('login')}>Se connecter</button></p>
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h1>Réinitialiser le mot de passe</h1>
              <p className="subtitle">Saisis ton email pour recevoir un lien</p>

              <form onSubmit={(e) => { e.preventDefault(); alert('Lien envoyé !'); }} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="toi@example.com"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary btn-full">
                  Envoyer le lien
                </button>
              </form>

              <div className="auth-footer">
                <button className="btn-tertiary" onClick={() => setMode('login')}>← Retour à la connexion</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
