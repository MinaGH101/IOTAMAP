import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const navigate = useNavigate(); // Hook for redirection

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/v1/authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (result.status === 'success') {
        // Save user_id for future GIS requests as per PDF spec
        localStorage.setItem('user_id', result.user_id);
        
        // Redirect to the Upload Page
        navigate('/projects'); 
      } else {
        alert('نام کاربری یا رمز عبور اشتباه است');
      }
    } catch (error) {
      alert('خطا در اتصال به سرور');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: '20px' }}>ورود به پنل کاربری</h2>
        <input 
          className="auth-input" 
          type="text" 
          placeholder="نام کاربری" 
          onChange={(e) => setFormData({...formData, username: e.target.value})} 
          required 
        />
        <input 
          className="auth-input" 
          type="password" 
          placeholder="رمز عبور" 
          onChange={(e) => setFormData({...formData, password: e.target.value})} 
          required 
        />
        <button className="auth-button" type="submit">ورود به سیستم</button>
        
        <p style={{ marginTop: '15px', fontSize: '0.9rem' }}>
          حساب کاربری ندارید؟ <Link to="/register">ثبت‌نام کنید</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;