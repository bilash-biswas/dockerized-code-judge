import React from 'react';

const Login = ({ authData, setAuthData, handleLogin, setView, authError }) => {
  return (
    <div className="auth-view">
      <div className="glass auth-card">
        <h2>Login</h2>
        {authError && <div className="error-msg">{authError}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              required
              value={authData.email}
              onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              value={authData.password}
              onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
            />
          </div>
          <button className="btn-primary full" type="submit">
            Login
          </button>
        </form>
        <p onClick={() => setView('register')}>
          Don't have an account? Sign up
        </p>
      </div>
    </div>
  );
};

export default Login;
