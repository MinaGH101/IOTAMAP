import React, { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// 1. BLUEPRINT FOR THE API RESPONSE
interface AuthResponse {
  status: string;
  user_id: string;
  username?: string; // Optional if needed later
}

const Login: React.FC = () => {
  // 2. TYPING THE FORM STATE
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  // 3. TYPING THE SUBMIT HANDLER
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const result: AuthResponse = await response.json();

      if (result.status === 'success') {
        // Save user_id for future GIS requests
        localStorage.setItem('user_id', result.user_id);
        if (result.username) localStorage.setItem('username', result.username);
        
        // Redirect to the Project List Page
        navigate('/projects'); 
      } else {
        alert('نام کاربری یا رمز عبور اشتباه است');
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
        <h2 style={{ marginBottom: '20px' }}>ورود به پنل کاربری</h2>
        
        <input 
          className="auth-input" 
          type="text" 
          placeholder="نام کاربری" 
          value={formData.username}
          onChange={(e: ChangeEvent<HTMLInputElement>) => 
            setFormData({...formData, username: e.target.value})
          } 
          required 
        />
        
        <input 
          className="auth-input" 
          type="password" 
          placeholder="رمز عبور" 
          value={formData.password}
          onChange={(e: ChangeEvent<HTMLInputElement>) => 
            setFormData({...formData, password: e.target.value})
          } 
          required 
        />
        
        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? "در حال ورود..." : "ورود به سیستم"}
        </button>
        
        <p style={{ marginTop: '15px', fontSize: '0.9rem' }}>
          حساب کاربری ندارید؟ <Link to="/register">ثبت‌نام کنید</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;