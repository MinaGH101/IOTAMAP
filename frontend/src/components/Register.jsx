import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password_try: '',
    nickname: '',
    rule_id: 'fe673a9f4a2', // Default role from PDF
    time_expiration: '0',
    mobile: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.password_try) {
      alert('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }

    try {
      // 1. ارسال درخواست ثبت‌نام به بک‌اَند
      const response = await fetch('http://localhost:8000/api/v1/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        const userData = await response.json();
        
        // 2. ورود خودکار: ذخیره اطلاعات در LocalStorage برای استفاده در کل اپلیکیشن
        if (userData && userData.id) {
          localStorage.setItem('user_id', userData.id);
          localStorage.setItem('username', userData.username);
          
          alert('ثبت‌نام و ورود با موفقیت انجام شد');
          // هدایت مستقیم به لیست پروژه‌ها
          navigate('/projects');
        } else {
          // اگر دیتای کاربر برنگشت، به صفحه لاگین برود
          alert('ثبت‌نام موفق بود، لطفاً وارد شوید');
          navigate('/login');
        }
      } else {
        const errorData = await response.json();
        alert('خطا در ثبت‌نام: ' + (errorData.detail || 'مشکل فنی'));
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('خطا در اتصال به سرور');
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
          onChange={(e) => setFormData({...formData, username: e.target.value})} 
          required 
        />
        
        <input 
          className="auth-input" 
          placeholder="نام نمایشی (نیک‌نیم)" 
          value={formData.nickname}
          onChange={(e) => setFormData({...formData, nickname: e.target.value})} 
          required 
        />
        
        <input 
          className="auth-input" 
          placeholder="شماره موبایل" 
          value={formData.mobile}
          onChange={(e) => setFormData({...formData, mobile: e.target.value})} 
          required 
        />
        
        <input 
          className="auth-input" 
          type="password" 
          placeholder="رمز عبور" 
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})} 
          required 
        />
        
        <input 
          className="auth-input" 
          type="password" 
          placeholder="تکرار رمز عبور" 
          value={formData.password_try}
          onChange={(e) => setFormData({...formData, password_try: e.target.value})} 
          required 
        />
        
        <button className="auth-button" type="submit">ثبت‌نام و ورود</button>

        {/* بخش بازگشت به لاگین با استفاده از استایل‌های موجود */}
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