import React, { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

// تعریف ساختار پاسخ دریافتی از سرور
interface RegisterResponse {
  id: string;
  username: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password_try: '',
    nickname: '',
    rule_id: 'fe673a9f4a2', // نقش پیش‌فرض
    time_expiration: '0',
    mobile: ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.password_try) {
      alert('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        const userData: RegisterResponse = await response.json();
        
        if (userData && userData.id) {
          localStorage.setItem('user_id', userData.id);
          localStorage.setItem('username', userData.username);
          
          alert('ثبت‌نام و ورود با موفقیت انجام شد');
          navigate('/projects');
        } else {
          alert('ثبت‌نام موفق بود، لطفاً وارد شوید');
          navigate('/login');
        }
      } else {
        const errorData = await response.json();
        alert('خطا در ثبت‌نام: ' + (errorData.detail || 'مشکل فنی'));
      }
    } catch (error) {
      alert('خطا در اتصال به سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2 className="entry-title-fa" style={{ fontSize: '24px', marginBottom: '20px' }}>ثبت‌نام کاربر جدید</h2>
        
        <input 
          className="auth-input" 
          placeholder="نام کاربری" 
          value={formData.username}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, username: e.target.value})} 
          required 
        />
        
        <input 
          className="auth-input" 
          placeholder="نام نمایشی (نیک‌نیم)" 
          value={formData.nickname}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, nickname: e.target.value})} 
          required 
        />
        
        <input 
          className="auth-input" 
          placeholder="شماره موبایل" 
          value={formData.mobile}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, mobile: e.target.value})} 
          required 
        />
        
        <input 
          className="auth-input" 
          type="password" 
          placeholder="رمز عبور" 
          value={formData.password}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, password: e.target.value})} 
          required 
        />
        
        <input 
          className="auth-input" 
          type="password" 
          placeholder="تکرار رمز عبور" 
          value={formData.password_try}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, password_try: e.target.value})} 
          required 
        />
        
        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? "در حال پردازش..." : "ثبت‌نام و ورود"}
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--text-soft)' }}>
          <span>قبلاً ثبت‌نام کرده‌اید؟ </span>
          <span 
            onClick={() => navigate('/login')} 
            style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 'bold', textShadow: '0 0 10px rgba(74, 113, 252, 0.3)' }}
          >
            وارد شوید
          </span>
        </div>
      </form>
    </div>
  );
};

export default Register;