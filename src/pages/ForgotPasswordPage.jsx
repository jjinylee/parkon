import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPasswordPage() {
  const location = useLocation();
  const email = location.state?.email;

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }).then(result => {
      setMessage(result.message || '가입하신 이메일로 비밀번호 재설정 링크를 발송했습니다.');
    }).catch(err => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }, [email]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-[28px] tracking-tight">
            <span className="font-bold text-[#171C1F]">주차</span>
            <span className="font-extrabold text-primary">ON</span>
          </Link>
          <p className="text-sm text-text-sub mt-2">비밀번호 재설정</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white/60 p-8 text-center">
          {loading && <p className="text-text-sub text-sm">발송 중입니다...</p>}
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium">{error}</div>}
          {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium">{message}</div>}
          {!email && !loading && !message && (
            <p className="text-text-sub text-sm">로그인 페이지에서 이메일을 입력한 후 이용해주세요.</p>
          )}
          <div className="mt-6">
            <Link to="/login" className="text-sm text-primary hover:underline">로그인으로 돌아가기</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
