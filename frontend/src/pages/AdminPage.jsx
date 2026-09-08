import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../styles/admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const adminToken = searchParams.get('token');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [filterPremium, setFilterPremium] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  };

  // Fetch stats
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [adminToken]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/webhooks`, { headers });
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
    }
    setLoading(false);
  };

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/subscriptions`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    }
    setLoading(false);
  };

  const fetchUserDetail = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user/${userId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUserDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch user detail:', err);
    }
  };

  const grantPremium = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user/grant-premium`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        setSuccess('Premium granted!');
        fetchUsers();
        fetchStats();
      } else {
        setError('Failed to grant premium');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const revokePremium = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user/revoke-premium`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        setSuccess('Premium revoked!');
        fetchUsers();
        fetchStats();
      } else {
        setError('Failed to revoke premium');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/user/${userId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setSuccess('User deleted!');
        fetchUsers();
        fetchStats();
        setUserDetail(null);
      } else {
        setError('Failed to delete user');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchEmail = u.email.toLowerCase().includes(searchEmail.toLowerCase());
    const matchPremium =
      filterPremium === 'all' ||
      (filterPremium === 'premium' && u.is_premium) ||
      (filterPremium === 'free' && !u.is_premium);
    return matchEmail && matchPremium;
  });

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>⚙️ Grandimi Admin Panel</h1>
        <div className="admin-nav">
          <button
            className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users');
              fetchUsers();
            }}
          >
            Users
          </button>
          <button
            className={`admin-tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('subscriptions');
              fetchSubscriptions();
            }}
          >
            Subscriptions
          </button>
          <button
            className={`admin-tab ${activeTab === 'webhooks' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('webhooks');
              fetchWebhooks();
            }}
          >
            Webhooks
          </button>
        </div>
      </div>

      {error && <div className="admin-alert error">{error}</div>}
      {success && <div className="admin-alert success">{success}</div>}

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && stats && (
        <div className="admin-dashboard">
          <div className="stat-card">
            <div className="stat-value">{stats.total_users}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-value">{stats.premium_users}</div>
            <div className="stat-label">Premium Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">€{stats.estimated_mrr.toFixed(2)}</div>
            <div className="stat-label">Estimated MRR</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.webhooks_received}</div>
            <div className="stat-label">Webhooks Received</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.created_today}</div>
            <div className="stat-label">Created Today</div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="admin-section">
          <div className="filters">
            <input
              type="text"
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="search-input"
            />
            <select
              value={filterPremium}
              onChange={(e) => setFilterPremium(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Users</option>
              <option value="premium">Premium Only</option>
              <option value="free">Free Only</option>
            </select>
            <button onClick={fetchUsers} className="btn-refresh">
              Refresh
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Premium</th>
                    <th>Whop ID</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className={u.is_premium ? 'premium-row' : ''}>
                      <td className="email-cell">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            fetchUserDetail(u.id);
                          }}
                          className="link-btn"
                        >
                          {u.email}
                        </button>
                      </td>
                      <td>{u.is_premium ? '✅ Yes' : '❌ No'}</td>
                      <td className="whop-id">{u.whop_customer_id || '—'}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="actions">
                        {!u.is_premium ? (
                          <button
                            onClick={() => grantPremium(u.id)}
                            className="btn-small btn-grant"
                          >
                            Grant Premium
                          </button>
                        ) : (
                          <button
                            onClick={() => revokePremium(u.id)}
                            className="btn-small btn-revoke"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="btn-small btn-delete"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* USER DETAIL MODAL */}
          {selectedUser && userDetail && (
            <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setSelectedUser(null)}>
                  ✕
                </button>
                <h2>{selectedUser.email}</h2>
                <div className="user-details">
                  <div className="detail-group">
                    <strong>ID:</strong> {userDetail.user.id}
                  </div>
                  <div className="detail-group">
                    <strong>Premium:</strong> {userDetail.user.is_premium ? 'Yes' : 'No'}
                  </div>
                  <div className="detail-group">
                    <strong>Whop Customer ID:</strong>{' '}
                    {userDetail.user.whop_customer_id || 'None'}
                  </div>
                  <div className="detail-group">
                    <strong>Created:</strong>{' '}
                    {new Date(userDetail.user.created_at).toLocaleString()}
                  </div>

                  {userDetail.predictions && userDetail.predictions.length > 0 && (
                    <div className="detail-group">
                      <strong>Predictions ({userDetail.predictions.length})</strong>
                      <div className="predictions-list">
                        {userDetail.predictions.map((p) => (
                          <div key={p.id} className="prediction-item">
                            <span>{p.age}y, {p.sex}</span>
                            <span>{p.height_cm}cm → {p.predicted_height.toFixed(1)}cm</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBSCRIPTIONS TAB */}
      {activeTab === 'subscriptions' && (
        <div className="admin-section">
          <button onClick={fetchSubscriptions} className="btn-refresh">
            Refresh
          </button>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Whop Sub ID</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s.id} className={s.status === 'active' ? 'active-row' : ''}>
                      <td className="truncate">{s.user_id}</td>
                      <td className="truncate">{s.whop_subscription_id}</td>
                      <td>
                        <span className={`badge badge-${s.status}`}>{s.status}</span>
                      </td>
                      <td>{new Date(s.created_at).toLocaleDateString()}</td>
                      <td>{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* WEBHOOKS TAB */}
      {activeTab === 'webhooks' && (
        <div className="admin-section">
          <button onClick={fetchWebhooks} className="btn-refresh">
            Refresh
          </button>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="webhooks-list">
              {webhooks.map((w) => (
                <div key={w.id} className={`webhook-item webhook-${w.status}`}>
                  <div className="webhook-header">
                    <span className="webhook-type">{w.event_type}</span>
                    <span className="webhook-email">{w.user_email}</span>
                    <span className="webhook-status">{w.status}</span>
                  </div>
                  <div className="webhook-time">
                    {new Date(w.created_at).toLocaleString()}
                  </div>
                  <details>
                    <summary>Show Payload</summary>
                    <pre>{JSON.stringify(JSON.parse(w.payload), null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
