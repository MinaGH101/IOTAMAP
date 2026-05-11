import React, { useState } from 'react';

const Register = () => {
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

    const response = await fetch('http://localhost:8000/api/v1/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    if (response.ok) {
      alert('ثبت‌نام با موفقیت انجام شد');
    } else {
      alert('خطا در ثبت‌نام');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>ثبت‌نام کاربر جدید</h2>
        <input className="auth-input" placeholder="نام کاربری" onChange={(e) => setFormData({...formData, username: e.target.value})} required />
        <input className="auth-input" placeholder="نام نمایشی (نیک‌نیم)" onChange={(e) => setFormData({...formData, nickname: e.target.value})} required />
        <input className="auth-input" placeholder="شماره موبایل" onChange={(e) => setFormData({...formData, mobile: e.target.value})} required />
        <input className="auth-input" type="password" placeholder="رمز عبور" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
        <input className="auth-input" type="password" placeholder="تکرار رمز عبور" onChange={(e) => setFormData({...formData, password_try: e.target.value})} required />
        <button className="auth-button" type="submit">ثبت‌نام</button>
      </form>
    </div>
  );
};

export default Register;