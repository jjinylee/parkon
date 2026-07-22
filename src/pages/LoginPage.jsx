import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken } from '../api';
import { useAuth } from '../AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(result.user, result.token);
      navigate(result.user.role === 'admin' || result.user.role === 'super_admin' ? '/admin' : localStorage.getItem('visited_mypage') ? '/' : '/mypage');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-[28px] tracking-tight">
            <span className="font-bold text-[#171C1F]">주차</span>
            <span className="font-extrabold text-primary">ON</span>
          </Link>
           <p className="text-sm text-text-sub mt-2">모비젠 주차 관리 서비스</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white/60 p-8">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-sub mb-2">이메일</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="neumorphic-recessed w-full p-3 text-sm" placeholder="example@company.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-sub mb-2">비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="neumorphic-recessed w-full p-3 text-sm" placeholder="비밀번호를 입력하세요" required />
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" state={{ email }} className="text-sm text-primary hover:underline">비밀번호 찾기</Link>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition-all text-sm shadow-lg disabled:opacity-40">
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <span className="text-sm text-text-sub">아직 계정이 없으신가요? </span>
            <Link to="/signup" className="text-sm text-primary font-bold hover:underline">회원가입</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
