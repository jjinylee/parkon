import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl border border-outline-variant bg-white/60 p-8">
            <p className="text-red-700 font-medium mb-4">유효하지 않은 접근입니다.</p>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">비밀번호 찾기 다시 시도</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      const result = await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setMessage(result.message || '비밀번호가 재설정되었습니다.');
      setTimeout(() => navigate('/login'), 3000);
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
          <p className="text-sm text-text-sub mt-2">새 비밀번호 설정</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white/60 p-8">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
          {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium">{message}</div>}
          {!message && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-sub mb-2">새 비밀번호</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="neumorphic-recessed w-full p-3 text-sm" placeholder="영문+숫자+특수문자 8자 이상" required minLength={8} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-sub mb-2">비밀번호 확인</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="neumorphic-recessed w-full p-3 text-sm" placeholder="비밀번호를 다시 입력하세요" required minLength={8} />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition-all text-sm shadow-lg disabled:opacity-40">
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          )}
          {message && (
            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm text-primary hover:underline">로그인하러 가기</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
