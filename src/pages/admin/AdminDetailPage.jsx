import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../../api';
import { getTemplateBadgeClass, getTemplateBadgeLabel } from '../../utils/status';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminDetailPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [template, setTemplate] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    api(`/templates/${templateId}`).then(setTemplate).catch(() => navigate('/admin'));
  };

  useEffect(load, [templateId, location.key]);

  const handleDelete = async () => {
    try {
      await api(`/templates/${templateId}`, { method: 'DELETE' });
      navigate('/admin');
    } catch (err) {
      alert(err.message || '삭제에 실패했습니다.');
    }
  };

  if (!template) return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <main className="flex-1 pt-[64px] ml-0 md:ml-[200px]">
        <AdminHeader />
        <div className="p-8 text-center text-text-sub">로딩 중...</div>
      </main>
    </div>
  );

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
            <span>신청 개설</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="font-medium">상세</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-bold">{template.title}</h1>
            <span className={`px-3 py-1 rounded-full font-bold text-[11px] ${getTemplateBadgeClass(template)}`}>{getTemplateBadgeLabel(template)}</span>
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
          <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
            <h2 className="text-sm font-bold text-text-sub mb-4">기본 정보</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] font-bold text-text-sub">작성자</label>
                <p className="text-sm font-bold mt-0.5">{template.author}</p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-text-sub">참여 기간</label>
                <p className="text-sm font-bold mt-0.5">{template.start_date} ~ {template.end_date}</p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-text-sub">수정 허용</label>
                <p className="text-sm font-bold mt-0.5">{template.allow_modify ? '허용' : '미허용'}</p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-text-sub">등록일</label>
                <p className="text-sm font-bold mt-0.5">{template.created_at}</p>
              </div>
            </div>
          </div>

          {(template.description || (template.attachments && template.attachments.length > 0)) && (
            <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
              <h2 className="text-sm font-bold text-text-sub mb-3">신청 안내 설명</h2>
              {template.description && (
                <div className="bg-surface-container-low rounded-lg p-4 text-sm" dangerouslySetInnerHTML={{ __html: template.description }} />
              )}
              {template.attachments && template.attachments.length > 0 && (
                <div className={template.description ? 'mt-4 space-y-2' : 'space-y-2'}>
                  <p className="text-xs font-medium text-text-sub mb-1">첨부 파일 ({template.attachments.length}개)</p>
                  {template.attachments.map((f) => (
                    <a key={f.id}
                      href={`/api/v1/files/${f.id}/download`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant bg-white hover:bg-gray-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-primary">description</span>
                      <span className="text-sm font-medium flex-1 truncate">{f.original_name}</span>
                      <span className="text-xs text-text-sub">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="material-symbols-outlined text-sm text-text-sub">download</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
            <h2 className="text-sm font-bold text-text-sub mb-4">질문 목록 ({template.questions?.length || 0}개)</h2>
            <div className="space-y-3">
              {(!template.questions || template.questions.length === 0) ? (
                <p className="text-sm text-text-sub text-center py-4">등록된 질문이 없습니다.</p>
              ) : (
                template.questions.map((q, i) => {
                  const hasOptions = q.options && q.options.length > 0 && q.options[0].id !== null;
                  return (
                    <div key={q.id || i} className="border rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${q.is_required ? 'bg-primary-light text-badge-active-text' : 'bg-gray-100 text-gray-500'}`}>
                          {q.is_required ? '필수' : '선택'}
                        </span>
                        <span className="font-bold text-sm">{i + 1}. {q.question_text}</span>
                        {q.score > 0 && <span className="ml-auto text-primary font-bold text-xs">{q.score} pt</span>}
                      </div>
                      <p className="text-[11px] text-text-sub ml-7 mb-2">입력 유형: {q.input_type}</p>
                      {hasOptions && (
                        <div className="ml-7 flex flex-wrap gap-1.5">
                          {q.options.map((o, oi) => (
                            <span key={o.id || oi} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-[11px] text-text-sub">
                              {o.option_text}
                              {o.score > 0 && <span className="text-primary font-bold">+{o.score}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                      {q.input_type !== 'radio' && q.placeholder && (
                        <p className="text-[11px] text-gray-400 ml-7 mt-1">예시: {q.placeholder}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Consent info */}
          <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-light text-badge-active-text">필수</span>
              <h4 className="font-bold text-sm">입력하신 사실과 불일치하는 경우, 3개월간 주차 이용이 제한될 수 있습니다. 이에 동의하시겠습니까?</h4>
            </div>
            <div className="ml-7 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-[11px] text-text-sub">예(동의)</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-[11px] text-text-sub">아니오(미동의)</span>
            </div>
          </div>

          {template.attachments && template.attachments.length > 0 && (
            <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
              <h2 className="text-sm font-bold text-text-sub mb-4">첨부 파일 ({template.attachments.length}개)</h2>
              <div className="space-y-2">
                {template.attachments.map((f) => (
                  <a key={f.id}
                    href={`/api/v1/files/${f.id}/download`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-primary">description</span>
                    <span className="text-sm font-medium flex-1 truncate">{f.original_name}</span>
                    <span className="text-xs text-text-sub">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span className="material-symbols-outlined text-sm text-text-sub">download</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-2">
            <button onClick={() => navigate('/admin')} className="w-full sm:w-auto px-8 py-2.5 rounded-lg border border-primary-light text-primary font-bold text-sm hover:bg-primary/5 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">arrow_back</span>목록
            </button>
            <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={() => navigate('/admin/copy', { state: { template, edit: true } })} className="flex-1 sm:flex-none px-8 py-2.5 rounded-lg border border-primary-light text-primary font-bold text-sm hover:bg-primary/5">
                수정
              </button>
              <button onClick={() => setDeleteTarget(true)} className="flex-1 sm:flex-none px-8 py-2.5 rounded-lg border border-red-200 text-red-500 font-bold text-sm hover:bg-red-50">
                삭제
              </button>
            </div>
          </div>
        </div>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-2">템플릿 삭제</h3>
            <p className="text-sm text-text-sub mb-2">정말로 <strong>{template.title}</strong> 템플릿을 삭제하시겠습니까?</p>
            <p className="text-xs text-red-500 mb-6">이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(false)} className="px-6 py-2.5 rounded-lg border border-outline-variant text-sm font-bold hover:bg-gray-50">취소</button>
              <button onClick={handleDelete} className="px-6 py-2.5 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
