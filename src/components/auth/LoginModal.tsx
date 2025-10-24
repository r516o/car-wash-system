import React, { useState } from 'react';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string, role: 'employee' | 'manager') => void;
  role: 'employee' | 'manager';
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, role }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    // Simple validation - in production, this should be API call
    if (role === 'employee' && username === 'employee' && password === 'emp123') {
      onLogin(username, password, role);
      onClose();
    } else if (role === 'manager' && username === 'manager' && password === 'mgr123') {
      onLogin(username, password, role);
      onClose();
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="login-modal-close" onClick={onClose}>&times;</button>
        <h2 className="login-modal-title">
          {role === 'employee' ? '🧑‍💼 تسجيل دخول الموظف' : '👨‍💼 تسجيل دخول المدير'}
        </h2>
        <form onSubmit={handleSubmit} className="login-modal-form">
          <div className="login-modal-field">
            <label htmlFor="username">اسم المستخدم</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              autoFocus
            />
          </div>
          <div className="login-modal-field">
            <label htmlFor="password">كلمة المرور</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
            />
          </div>
          {error && <div className="login-modal-error">{error}</div>}
          <button type="submit" className="login-modal-submit">
            تسجيل الدخول
          </button>
        </form>
        <div className="login-modal-hint">
          <p><strong>للاختبار:</strong></p>
          <p>{role === 'employee' ? 'موظف: employee / emp123' : 'مدير: manager / mgr123'}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
