import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { getTemplateBadgeClass, getTemplateBadgeLabel } from '../../utils/status';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    api('/templates?_=' + Date.now()).then(setTemplates).catch(() => {});
  }, []);

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
            <span className="font-medium text-text-main">신청 개설</span>
          </nav>
          <h1 className="text-[20px] font-bold text-[#171C1F]">신청 개설 관리</h1>
        </div>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 className="text-xl font-bold">최근 등록 현황</h2>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => navigate('/admin/questions')} className="flex-1 md:flex-none px-5 py-2.5 bg-blue-400 text-white font-bold rounded-lg hover:shadow-md transition-all">
                질문항목 관리
              </button>
              <button onClick={() => navigate('/admin/create')} className="flex-1 md:flex-none px-5 py-2.5 bg-primary text-white font-bold rounded-lg flex items-center justify-center gap-1.5 hover:shadow-md transition-all">
                <span className="material-symbols-outlined">add</span>
                등록
              </button>
            </div>
          </div>
          <span className="text-sm">총 <strong className="text-primary">{templates.length}</strong>건</span>
          <div className="bento-card overflow-hidden mt-3">
            <table className="w-full text-left">
              <thead className="bg-surface-container text-xs font-bold">
                <tr className="border-b">
                  <th className="p-4">상태</th>
                  <th className="p-4">제목</th>
                  <th className="p-4">기간</th>
                  <th className="p-4">작성자</th>
                  <th className="p-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {templates.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-[#F8F9FF]">
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full font-bold text-[11px] whitespace-nowrap ${getTemplateBadgeClass(t)}`}>
                        {getTemplateBadgeLabel(t)}
                      </span>
                    </td>
                    <td className="p-4 font-bold whitespace-nowrap">
                      <button onClick={() => navigate(`/admin/templates/${t.id}`)} className="hover:text-primary transition-colors text-left">
                        {t.title}
                      </button>
                    </td>
                    <td className="p-4 text-text-sub whitespace-nowrap">{t.start_date} ~ {t.end_date}</td>
                    <td className="p-4 text-text-sub whitespace-nowrap">{t.author}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button onClick={() => navigate('/admin/status', { state: { templateId: t.id } })} className="text-primary font-bold hover:underline text-xs mr-3">[신청현황]</button>
                      <button onClick={() => navigate('/admin/copy', { state: { template: t } })} className="text-primary font-bold hover:underline text-xs">[복사]</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
