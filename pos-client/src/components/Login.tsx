import { useState } from 'react';
import apiClient from '../api/client';
import './Login.css';

function Login({ onLoginSuccess }: { onLoginSuccess: () => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // ✅ FIXED: response is already the data (not response.data)
            const data = await apiClient.post('/auth/login', { username, password });
            const { accessToken, user } = data; // ✅ Direct access

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('user', JSON.stringify(user));
            onLoginSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل تسجيل الدخول. حاول مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="cart-icon">🛒</div>
                    <h1>نظام نقاط البيع</h1>
                    <h2>تسجيل الدخول</h2>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>اسم المستخدم</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="admin"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>كلمة المرور</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••"
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'جاري الدخول...' : 'دخول'}
                    </button>
                </form>

                <div className="test-accounts">
                    <p><strong>حسابات تجريبية:</strong></p>
                    <p>المدير: <code>admin / admin123</code></p>
                    <p>الكاشير: <code>cashier / 123456</code></p>
                </div>
            </div>
        </div>
    );
}

export default Login;
