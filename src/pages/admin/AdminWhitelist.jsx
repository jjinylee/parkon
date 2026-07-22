import { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminWhitelist() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', car_number: '', phone: '', position: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async (search = '') => {
    try { const d = await api(`/whitelist?search=${search}`); setRows(d.items || []); } catch { setRows([]); }
  };

  const handleSearch = () => { loadData(searchText); };

  const handleDelete = async () => {
    if (selected.size === 0) return alert('선택된 항목이 없습니다.');
    if (!confirm('삭제하시겠습니까?')) return;
    await api('/whitelist', { method: 'DELETE', body: JSON.stringify({ ids: [...selected] }) });
    setSelected(new Set()); loadData();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    await api('/whitelist', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false); setForm({ name: '', car_number: '', phone: '', position: '' }); loadData();
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
            <span className="font-medium">화이트리스트</span>
          </nav>
          <h1 className="text-[20px] font-bold">화이트리스트 관리</h1>
        </div>
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-end gap-3 items-stretch sm:items-center">
            <input className="neumorphic-recessed px-4 py-2 text-sm w-full sm:w-80" placeholder="이름 또는 차량번호 검색" value={searchText} onChange={e => setSearchText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button onClick={handleSearch} className="bg-primary text-white font-bold py-2 px-5 rounded-lg text-sm flex items-center justify-center gap-1 w-full sm:w-auto"><span className="material-symbols-outlined text-sm">search</span>조회</button>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className="text-sm">총 <strong className="text-primary">{rows.length}</strong>건</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleDelete} className="flex-1 sm:flex-none px-4 py-2 bg-danger-container text-danger font-bold rounded-lg text-xs">삭제</button>
              <button onClick={() => setShowForm(true)} className="flex-1 sm:flex-none px-4 py-2 border border-primary text-primary font-bold rounded-lg text-xs flex items-center justify-center gap-0.5">+등록</button>
            </div>
          </div>
          <div className="bento-card overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
              <thead className="bg-surface-container text-xs font-bold">
                <tr className="border-b">
                  <th className="p-4 w-12 text-center"><input type="checkbox" /></th>
                  <th className="p-4">No.</th>
                  <th className="p-4">이름</th>
                  <th className="p-4">차량 번호</th>
                  <th className="p-4">휴대폰 번호</th>
                  <th className="p-4">직책</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {rows.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-[#F8F9FF]">
                    <td className="p-4 text-center"><input type="checkbox" checked={selected.has(r.id)} onChange={() => { const n = new Set(selected); n.has(r.id) ? n.delete(r.id) : n.add(r.id); setSelected(n); }} /></td>
                    <td className="p-4 text-text-sub">{r.id}</td>
                    <td className="p-4 font-bold">{r.name}</td>
                    <td className="p-4">{r.car_number}</td>
                    <td className="p-4 text-text-sub">{r.phone}</td>
                    <td className="p-4 text-text-sub">{r.position || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">화이트리스트 등록</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <input className="neumorphic-recessed w-full p-3 text-sm" placeholder="이름" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input className="neumorphic-recessed w-full p-3 text-sm" placeholder="차량번호" value={form.car_number} onChange={e => setForm({ ...form, car_number: e.target.value })} required />
              <input className="neumorphic-recessed w-full p-3 text-sm" placeholder="휴대폰번호" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
              <input className="neumorphic-recessed w-full p-3 text-sm" placeholder="직책" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">취소</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">등록</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
