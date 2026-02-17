import React from 'react';

const Register = ({ authData, setAuthData, handleRegister, setView, authError }) => {
  return (
    <div className="auth-view">
      <div className="glass auth-card">
        <h2>Create Account</h2>
        {authError && <div className="error-msg">{authError}</div>}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              required
              value={authData.username}
              onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
            />
          </div>
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
            Register
          </button>
        </form>
        <p onClick={() => setView('login')}>
          Already have an account? Login
        </p>
      </div>
    </div>
  );
};

export default Register;
