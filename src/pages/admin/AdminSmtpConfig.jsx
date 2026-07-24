import { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminSmtpConfig() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({ host: '', port: 1025, user: '', password: '', from_email: '' });
  const [hasPassword, setHasPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const cfg = await api('/config/smtp');
      if (cfg) {
        setForm({ host: cfg.host, port: cfg.port, user: cfg.user, password: '', from_email: cfg.from_email });
        setHasPassword(cfg.has_password);
      }
    } catch { setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' }); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api('/config/smtp', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setHasPassword(!!form.password);
      setForm(p => ({ ...p, password: '' }));
      setMessage({ type: 'success', text: 'SMTP 설정이 저장되었습니다.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const body = { ...form };
      if (!body.password && hasPassword) {
        const cfg = await api('/config/smtp');
        body.password = '__KEEP__';
      }
      const result = await api('/config/smtp/test', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setMessage({ type: 'success', text: result.message || '연결 성공' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally { setTesting(false); }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <main className="flex-1 pt-[64px] ml-0 md:ml-[200px]">
        <AdminHeader />
        <div className="bg-white border-b border-outline-variant px-4 md:px-6 py-2 md:py-3 flex flex-col gap-1 sticky top-[64px] z-40">
          <nav className="flex items-center gap-1 text-[11px] text-text-sub">
            <button className="md:hidden material-symbols-outlined text-[18px] text-text-sub mr-1" onClick={() => setSidebarOpen(true)}>menu</button>
            <span>관리자</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>설정 관리</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="font-medium">SMTP 설정</span>
          </nav>
          <h1 className="text-[20px] font-bold">SMTP 설정</h1>
        </div>
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
          {message && (
            <div className={`px-4 py-3 rounded-lg text-sm font-bold ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="bento-card p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-text-main mb-1.5">SMTP 서버</label>
              <input className="neumorphic-recessed w-full p-3 text-sm" placeholder="smtp.gmail.com" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-main mb-1.5">포트</label>
              <input type="number" className="neumorphic-recessed w-full p-3 text-sm" placeholder="587" value={form.port} onChange={e => setForm({ ...form, port: parseInt(e.target.value) || 0 })} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-main mb-1.5">사용자</label>
              <input className="neumorphic-recessed w-full p-3 text-sm" placeholder="user@company.com" value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-main mb-1.5">
                비밀번호 {hasPassword && !form.password && <span className="text-text-sub font-normal text-xs">(저장됨, 변경 시에만 입력)</span>}
              </label>
              <input type="password" className="neumorphic-recessed w-full p-3 text-sm" placeholder="********" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-main mb-1.5">발신 이메일</label>
              <input type="email" className="neumorphic-recessed w-full p-3 text-sm" placeholder="parkon@company.com" value={form.from_email} onChange={e => setForm({ ...form, from_email: e.target.value })} required />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:shadow-md transition-all disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
              <button type="button" onClick={handleTest} disabled={testing} className="flex-1 py-3 border border-primary text-primary font-bold rounded-lg hover:bg-primary-light transition-all disabled:opacity-50">
                {testing ? '테스트 중...' : '테스트 메일 발송'}
              </button>
            </div>
          </form>

          <div className="text-xs text-text-sub bg-surface-container-low rounded-lg p-4 space-y-1">
            <p className="font-bold text-text-main mb-1">⚠️ 주의사항</p>
            <p>• 비밀번호는 AES-256-CBC로 암호화되어 DB에 저장됩니다.</p>
            <p>• 저장 시 비밀번호를 비워두면 기존 비밀번호가 유지됩니다.</p>
            <p>• 테스트 메일은 입력한 발신 이메일로 전송됩니다.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
