import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || attempts >= 5) return;

    setError('');
    setLoading(true);
    try {
      await login(emailRef.current.value, passwordRef.current.value);
      navigate('/');
    } catch (err) {
      setAttempts(a => a + 1);
      // Generic error — ไม่บอกว่าอีเมลหรือรหัสผ่านผิด เพื่อความปลอดภัย
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      
      {/* Animated background orbs */}
      <div className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl"
           style={{ background: 'radial-gradient(circle, #6366f1, transparent)', top: '-5%', left: '-5%', animation: 'pulse 8s ease-in-out infinite' }}/>
      <div className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl"
           style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', bottom: '-5%', right: '-5%', animation: 'pulse 10s ease-in-out infinite reverse' }}/>

      {/* Login Card */}
      <div className="relative w-full max-w-md mx-4"
           style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>
        
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/30">
              <span className="text-white font-black text-3xl leading-none">P</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">PostDash</h1>
            <p className="text-indigo-300 text-sm mt-1">ระบบจัดการลูกค้า — เข้าสู่ระบบ</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm">
              <AlertCircle size={16} className="shrink-0"/>
              <span>{error}</span>
              {attempts >= 3 && <span className="ml-auto text-xs opacity-70">{attempts}/5 ครั้ง</span>}
            </div>
          )}

          {/* Failed lockout */}
          {attempts >= 5 && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm text-center font-medium">
              🔒 บัญชีถูกล็อคชั่วคราว กรุณาลองใหม่ภายหลัง
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-indigo-200 text-xs font-semibold mb-2 uppercase tracking-wider">อีเมล</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400"/>
                <input
                  ref={emailRef}
                  type="email"
                  required
                  placeholder="กรอกอีเมลของคุณ"
                  disabled={loading || attempts >= 5}
                  className="w-full pl-11 pr-4 py-3 text-white placeholder-indigo-400/50 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onKeyDown={(e) => e.key === 'Enter' && passwordRef.current?.focus()}
                />
              </div>
            </div>

            <div>
              <label className="block text-indigo-200 text-xs font-semibold mb-2 uppercase tracking-wider">รหัสผ่าน</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400"/>
                <input
                  ref={passwordRef}
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="กรอกรหัสผ่าน"
                  disabled={loading || attempts >= 5}
                  className="w-full pl-11 pr-12 py-3 text-white placeholder-indigo-400/50 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-200 transition-colors">
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || attempts >= 5}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white text-sm transition-all mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 24px rgba(99,102,241,0.3)' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              ) : (
                <><LogIn size={16}/> เข้าสู่ระบบ</>
              )}
            </button>
          </form>

          <p className="text-center text-indigo-400/50 text-xs mt-6">
            🔒 ระบบได้รับการป้องกันด้วย Firebase Authentication
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
