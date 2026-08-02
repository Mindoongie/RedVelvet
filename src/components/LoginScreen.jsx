import React, { useState } from 'react';
import { Bus, ShieldCheck, UserCheck, HeartHandshake, Lock, Mail, ArrowRight, Sparkles, Key, AlertCircle } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('admin@edusafe.edu.vn');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');

  // User Accounts Database with Auto Role Detection
  const userDatabase = [
    {
      role: 'admin',
      roleTitle: 'Quản Trị Viên Nhà Trường',
      email: 'admin@edusafe.edu.vn',
      password: 'admin123',
      name: 'ThS. Nguyễn Văn Quản',
      icon: ShieldCheck,
      color: '#06b6d4'
    },
    {
      role: 'driver',
      roleTitle: 'Lái Xe Bus (Tablet Cabin)',
      email: 'driver.hung@edusafe.edu.vn',
      password: 'driver123',
      name: 'Tài Xế: Nguyễn Văn Hùng',
      icon: Bus,
      color: '#f59e0b'
    },
    {
      role: 'teacher',
      roleTitle: 'Giáo Viên Giám Sát (Tại Trường)',
      email: 'teacher.thu@edusafe.edu.vn',
      password: 'teacher123',
      name: 'Cô: Trần Thị Thu',
      icon: UserCheck,
      color: '#10b981',
      desc: 'Theo dõi điểm danh khuôn mặt từ xa · Xác nhận thủ công khi AI quét sai · Xem vị trí xe'
    },
    {
      role: 'parent',
      roleTitle: 'Phụ Huynh Học Sinh',
      email: 'parent.chi@edusafe.edu.vn',
      password: 'parent123',
      name: 'Phụ Huynh: Phạm Văn Nam',
      icon: HeartHandshake,
      color: '#38bdf8'
    }
  ];

  const handleFillAccount = (user) => {
    setEmail(user.email);
    setPassword(user.password);
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Auto-detect user role from email matching
    const matchedUser = userDatabase.find(
      u => u.email.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (matchedUser) {
      if (matchedUser.password === password) {
        onLogin({
          role: matchedUser.role,
          name: matchedUser.name,
          roleTitle: matchedUser.roleTitle,
          email: matchedUser.email
        });
      } else {
        setErrorMsg('Mật khẩu xác thực không đúng. Vui lòng thử lại!');
      }
    } else {
      setErrorMsg('Tài khoản email không tồn tại trong hệ thống!');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(circle at 50% 30%, var(--bg-card-hover) 0%, var(--bg-dark) 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Background glowing particles */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(8, 145, 178, 0.06)', filter: 'blur(80px)' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(217, 119, 6, 0.04)', filter: 'blur(80px)' }} />

      <div style={{ width: '900px', maxWidth: '100%', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px', zIndex: 10 }}>
        
        {/* Left Side: Brand Showcase & Quick Credentials Fill */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
              <img 
                src="/edusafe_logo.png" 
                alt="EduSafe Logo" 
                style={{ width: '52px', height: '52px', borderRadius: '12px', boxShadow: '0 0 20px rgba(6,182,212,0.5)' }} 
              />
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 900, background: 'linear-gradient(90deg, #38bdf8, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  EduSafe Bus
                </h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Hệ Thống An Toàn Xe Đưa Đón Học Sinh Ứng Dụng AI
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6', marginBottom: '20px' }}>
              Đăng nhập tài khoản cá nhân. Hệ thống tự động nhận diện vai trò và điều hướng đến màn hình tương ứng:
            </p>

            {/* Account fill shortcuts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {userDatabase.map((user) => {
                const Icon = user.icon;
                const isCurrent = email === user.email;
                return (
                  <div
                    key={user.role}
                    onClick={() => handleFillAccount(user)}
                    style={{
                      background: isCurrent ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                      border: isCurrent ? `2px solid ${user.color}` : '1px solid var(--border-card)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: `rgba(${user.role === 'admin' ? '6,182,212' : user.role === 'driver' ? '245,158,11' : user.role === 'teacher' ? '16,185,129' : '56,189,248'}, 0.15)`, padding: '6px', borderRadius: '6px' }}>
                        <Icon size={16} color={user.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-main)' }}>{user.roleTitle}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>
                    </div>

                    <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '4px 8px' }}>
                      Điền Mẫu
                    </button>
                  </div>
                );
              })}
            </div>

          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={14} color="var(--accent-cyan)" />
            <span>Mô hình AI: face-api.js, Inferensys Driver Safety, Haversine GPS.</span>
          </div>
        </div>

        {/* Right Side: Login Form Glass Card */}
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '24px', border: '1px solid var(--border-card)' }}>
          
          <div style={{ marginBottom: '24px' }}>
            <span className="badge-ai" style={{ marginBottom: '8px' }}>
              <Key size={12} /> Đăng Nhập Tự Động Phân Quyền
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px' }}>
              Đăng Nhập EduSafe Bus
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Nhập email để hệ thống tự nhận diện giao diện phù hợp
            </p>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: 'var(--danger-red)', padding: '10px', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Email Field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Địa chỉ Email Tài Khoản
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@edusafe.edu.vn"
                  style={{
                    width: '100%',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-primary" 
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                marginTop: '10px'
              }}
            >
              <span>ĐĂNG NHẬP VÀO HỆ THỐNG</span>
              <ArrowRight size={18} />
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}
