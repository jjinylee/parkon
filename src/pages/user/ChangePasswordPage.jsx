import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, logout } from '../../api';
import UserHeader from '../../components/UserHeader';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setSaving(true);
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password,
        }),
      });
      alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      logout();
    } catch (err) {
      alert(err.message || '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <UserHeader />
      <main className="pt-[64px] md:pt-24 pb-20 md:pb-24 px-4 md:px-gutter max-w-max-width mx-auto">
        <nav className="flex items-center gap-2 text-text-sub mb-4 text-xs">
          <span>홈</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <button onClick={() => navigate('/mypage')} className="hover:text-primary">마이페이지</button>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="font-bold text-primary">비밀번호 변경</span>
        </nav>
        <h1 className="text-[22px] md:text-[28px] font-semibold mb-6 md:mb-8">비밀번호 변경</h1>
        <div className="max-w-md">
          <section className="bento-card p-4 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-sub">현재 비밀번호</label>
                <input type="password" className="neumorphic-recessed p-3 rounded-lg border-none w-full" value={form.current_password} onChange={e => setForm({ ...form, current_password: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-sub">새 비밀번호</label>
                <input type="password" className="neumorphic-recessed p-3 rounded-lg border-none w-full" value={form.new_password} onChange={e => setForm({ ...form, new_password: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-sub">새 비밀번호 확인</label>
                <input type="password" className="neumorphic-recessed p-3 rounded-lg border-none w-full" value={form.confirm_password} onChange={e => setForm({ ...form, confirm_password: e.target.value })} required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => navigate('/mypage')} className="px-6 py-2.5 border border-outline-variant text-text-sub font-bold rounded-lg text-sm hover:bg-gray-50">
                  취소
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg text-sm disabled:opacity-50">
                  {saving ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
