import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.endsWith('@mobigen.com')) {
      setError('mobigen.com 도메인 이메일만 가입 가능합니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, phone, email, password }),
      });
      localStorage.removeItem('visited_mypage');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      alert('가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.');
      navigate('/login');
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
          <p className="text-sm text-text-sub mt-2">회원가입하고 주차ON을 이용해보세요</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white/60 p-8">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-sub mb-2">이름 <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="neumorphic-recessed w-full p-3 text-sm" placeholder="홍길동" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-sub mb-2">전화번호 <span className="text-red-500">*</span></label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="neumorphic-recessed w-full p-3 text-sm" placeholder="010-1234-5678" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-sub mb-2">회사 이메일 <span className="text-red-500">*</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="neumorphic-recessed w-full p-3 text-sm" placeholder="name@mobigen.com" required />
              <p className="text-[11px] text-text-sub mt-1">@mobigen.com 이메일만 가입 가능합니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-sub mb-2">비밀번호 <span className="text-red-500">*</span></label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="neumorphic-recessed w-full p-3 text-sm" placeholder="영문+숫자+특수문자 8자 이상" required minLength={8} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition-all text-sm shadow-lg disabled:opacity-40">
              {loading ? '처리 중...' : '회원가입'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <span className="text-sm text-text-sub">이미 계정이 있으신가요? </span>
            <Link to="/login" className="text-sm text-primary font-bold hover:underline">로그인</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
