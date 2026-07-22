import { useState, useEffect } from 'react';
import { api } from '../../api';

const STEP_LABEL = ['대상 선택', '템플릿 선택', '발송 확인'];

export default function MailSendModal({ rows, onClose, onSent }) {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [selectedTab, setSelectedTab] = useState('approved');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [result, setResult] = useState(null);

  const approved = rows.filter(r => r.status === 'approved');
  const rejected = rows.filter(r => r.status === 'rejected');
  const filtered = selectedTab === 'approved' ? approved : rejected;

  useEffect(() => {
    api('/mail-templates').then(setTemplates).catch(() => {});
  }, []);

  const toggleId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (filtered.every(r => selectedIds.has(r.id))) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(r => n.delete(r.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(r => n.add(r.id)); return n; });
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));
  const selectedRecipients = rows.filter(r => selectedIds.has(r.id));

  const handleSend = async () => {
    setSending(true);
    setProgress({ sent: 0, failed: 0, total: selectedRecipients.length });
    const tmpl = templates.find(t => t.id === Number(selectedTemplateId));
    const sentIds = [];
    let s = 0, f = 0;
    for (const r of selectedRecipients) {
      try {
        await api('/mail-templates/send', {
          method: 'POST',
          body: JSON.stringify({
            template_id: Number(selectedTemplateId),
            type: r.status === 'approved' ? 'approved' : 'rejected',
            application_ids: [r.id],
          }),
        });
        sentIds.push(r.id);
        s++;
      } catch {
        f++;
      }
      setProgress({ sent: s, failed: f, total: selectedRecipients.length });
    }
    const res = { sent: s, failed: f, application_ids: sentIds, template_title: tmpl?.title || '' };
    setResult(res);
    setSending(false);
    if (onSent) onSent(res);
  };

  const handleClose = () => {
    if (sending) return;
    if (result && onSent) onSent(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
          <h2 className="font-bold text-base">메일 발송</h2>
          <button onClick={handleClose} className="material-symbols-outlined text-text-sub hover:text-text">close</button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2 shrink-0">
          {STEP_LABEL.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${i === step ? 'bg-primary text-white' : i < step ? 'bg-badge-completed-bg text-badge-completed-text' : 'bg-gray-100 text-text-sub'}`}>
                {i + 1}
              </span>
              <span className={`text-[11px] ${i === step ? 'font-bold text-text' : 'text-text-sub'}`}>{label}</span>
              {i < STEP_LABEL.length - 1 && <span className="text-text-sub text-[10px]">›</span>}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4 min-h-0">
          {/* Step 0: Select recipients */}
          {step === 0 && (
            <>
              {/* Tab: 승인자 / 반려자 */}
              <div className="flex gap-2">
                <button onClick={() => setSelectedTab('approved')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${selectedTab === 'approved' ? 'bg-badge-completed-bg text-badge-completed-text' : 'bg-gray-50 text-text-sub hover:bg-gray-100'}`}>
                  승인자 {approved.length}명
                </button>
                <button onClick={() => setSelectedTab('rejected')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${selectedTab === 'rejected' ? 'bg-red-50 text-badge-rejected-text' : 'bg-gray-50 text-text-sub hover:bg-gray-100'}`}>
                  반려자 {rejected.length}명
                </button>
              </div>

              {/* Select all */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={allFilteredSelected} onChange={selectAll} className="accent-primary" />
                  <span className="text-xs font-bold text-text-sub">전체 선택</span>
                </label>
                <span className="text-xs text-text-sub">선택 {selectedIds.size}명</span>
              </div>

              {/* Recipient list */}
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-1">
                {filtered.map(r => (
                  <label key={r.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 ${selectedIds.has(r.id) ? 'bg-primary/5' : ''}`}>
                    <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleId(r.id)} className="accent-primary shrink-0" />
                    <span className="text-sm flex-1 min-w-0">{r.name}</span>
                    <span className="text-xs text-text-sub truncate max-w-[180px]">{r.email}</span>
                  </label>
                ))}
                {filtered.length === 0 && <p className="text-xs text-text-sub py-4 text-center">대상이 없습니다.</p>}
              </div>
            </>
          )}

          {/* Step 1: Select template */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="text-xs text-text-sub bg-gray-50 rounded-lg px-3 py-2">선택한 수신자 {selectedRecipients.length}명</div>
              <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}
                className="w-full neumorphic-recessed px-3 py-2 text-sm">
                <option value="">템플릿을 선택하세요</option>
                {templates.filter(t => t.status === 'active').map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              {selectedTemplateId && (() => {
                const tmpl = templates.find(t => t.id === Number(selectedTemplateId));
                return tmpl ? (
                  <div className="text-xs bg-gray-50 rounded-lg p-3 border max-h-48 overflow-y-auto [&_p]:mb-1 [&_strong]:font-bold" dangerouslySetInnerHTML={{ __html: tmpl.content }} />
                ) : null;
              })()}
            </div>
          )}

          {/* Step 2: Confirm & send */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-text-sub">수신 인원</span><span className="font-bold">{selectedRecipients.length}명</span></div>
                <div className="flex justify-between"><span className="text-text-sub">메일 템플릿</span><span className="font-bold">{templates.find(t => t.id === Number(selectedTemplateId))?.title || '-'}</span></div>
              </div>

              <div className="max-h-28 overflow-y-auto space-y-1">
                {selectedRecipients.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs px-2 py-1 bg-gray-50 rounded">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-text-sub">{r.email}</span>
                  </div>
                ))}
              </div>

              {sending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-text-sub">
                    <span>발송 진행 중...</span>
                    <span>{progress.sent + progress.failed} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${((progress.sent + progress.failed) / progress.total) * 100}%` }} />
                  </div>
                  <div className="text-xs text-text-sub">성공 {progress.sent} / 실패 {progress.failed}</div>
                </div>
              )}

              {result && (
                <div className={`rounded-lg p-3 text-sm text-center font-bold ${result.failed === 0 ? 'bg-green-50 text-badge-completed-text' : 'bg-red-50 text-badge-rejected-text'}`}>
                  {result.failed === 0 ? `${result.sent}건 모두 발송 완료` : `${result.sent}건 성공, ${result.failed}건 실패`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant shrink-0">
          <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="px-4 py-2 text-sm font-bold text-text-sub rounded-lg border border-outline-variant hover:bg-gray-50">
            {step === 0 ? '취소' : '이전'}
          </button>
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)}
              disabled={step === 0 ? selectedIds.size === 0 : !selectedTemplateId}
              className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg disabled:opacity-40">
              다음
            </button>
          ) : result ? (
            <button onClick={handleClose}
              className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg">
              닫기
            </button>
          ) : (
            <button onClick={handleSend} disabled={sending || selectedRecipients.length === 0}
              className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg disabled:opacity-40">
              {sending ? '발송 중...' : '발송'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
