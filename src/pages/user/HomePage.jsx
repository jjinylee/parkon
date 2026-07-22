import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { api } from '../../api';
import { parseLocalDate, getToday, isTemplateActive } from '../../utils/status';
import UserHeader from '../../components/UserHeader';

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!localStorage.getItem('visited_mypage')) {
      navigate('/mypage', { replace: true });
    }
  }, [navigate]);

  const [templates, setTemplates] = useState([]);
  const [applications, setApplications] = useState([]);
  const [helpPopup, setHelpPopup] = useState(null);
  const [helpPos, setHelpPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (helpPopup) {
      const h = () => setHelpPopup(null);
      document.addEventListener('click', h);
      return () => document.removeEventListener('click', h);
    }
  }, [helpPopup]);

  useEffect(() => {
    api('/templates?status=published').then(setTemplates).catch(() => {});
    api('/applications').then(setApplications).catch(() => {});
  }, [location.key]);
  return (
    <div className="bg-background min-h-screen">
      <UserHeader />
      <main className="pt-[64px] pb-16 px-4 md:px-gutter max-w-max-width mx-auto">
        <section className="mb-8">
          <div className="flex items-center gap-1 text-[13px] text-text-sub mb-2">
            <span>홈</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="font-semibold">주차 신청</span>
          </div>
          <h1 className="text-[22px] md:text-[28px] font-semibold text-text-main mb-1">주차 신청</h1>
          <p className="text-[13px] md:text-[15px] text-text-sub">
            현재 진행 중인 주차 신청 건과 최근 나의 신청 이력을 확인하는 화면입니다.
          </p>
        </section>
        <section className="mb-12">
          <div className="flex items-center gap-1.5 mb-4">
            <h2 className="text-[16px] md:text-[18px] font-bold text-text-main">진행 중인 신청 건</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {templates.filter(t => parseLocalDate(t.end_date) >= getToday()).map((t) => {
              const today = getToday();
              const start = parseLocalDate(t.start_date);
              const end = parseLocalDate(t.end_date);
              const isBeforeStart = start > today;
              const isExpired = end < today;
              const dDay = isExpired || isBeforeStart ? null : Math.ceil((end - today) / (1000 * 60 * 60 * 24));
              return (
              <div key={t.id} className={`relative flex flex-col rounded-2xl bg-white transition-all duration-200 ${
                isExpired
                  ? 'border border-[#E2E8F0] opacity-70'
                  : isBeforeStart
                    ? 'border border-[#E2E8F0] opacity-80'
                    : 'border border-[#E2E8F0] hover:shadow-[0_4px_20px_-8px_rgba(59,130,246,0.2)] hover:-translate-y-0.5'
              }`}>
                <div className={`absolute left-0 top-[10px] bottom-[10px] w-[3px] rounded-l-2xl ${isExpired ? 'bg-[#CBD5E1]' : 'bg-primary'}`} />
                <div className="pl-6 pr-5 pt-5 pb-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-3">
                    {isExpired ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F1F5F9] text-[#64748B] text-[11px] rounded-full font-bold">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        마감
                      </span>
                    ) : isBeforeStart ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-500 text-[11px] rounded-full font-bold">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        진행예정
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/8 text-primary text-[11px] rounded-full font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        진행중
                      </span>
                    )}
                    {dDay !== null && dDay > 0 && (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        D-{dDay}
                      </span>
                    )}
                  </div>
                  <h3 className={`text-[15px] md:text-[17px] font-bold mb-1 leading-snug ${isExpired ? 'text-[#94A3B8]' : 'text-[#171C1F]'}`}>{t.title}</h3>
                  <div className="flex items-center gap-1.5 text-[12px] text-[#64748B] mt-auto pt-3">
                    <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                    <span>{t.start_date} ~ {t.end_date}</span>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-0">
                  <button
                    onClick={() => !isExpired && !isBeforeStart && navigate('/register', { state: { templateId: t.id } })}
                    disabled={isExpired || isBeforeStart}
                    className={`w-full h-11 rounded-xl font-bold text-[14px] flex items-center justify-center gap-1.5 transition-all duration-200 ${
                      isExpired
                        ? 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
                        : isBeforeStart
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-[#2563EB] active:scale-[0.98] shadow-sm shadow-primary/20'
                    }`}
                  >
                    {isExpired ? '마감됨' : isBeforeStart ? '시작 전' : '신청하기'}
                    {!isExpired && !isBeforeStart && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
                  </button>
                </div>
              </div>
            )})}
            <div className="relative flex flex-col items-center justify-center text-center rounded-[24px] border border-white/60 bg-[#BFDBFE] p-7 md:min-h-[200px] overflow-hidden transition-all duration-500 hover:shadow-xl group">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-l-2xl" />
              <div className="absolute inset-0 z-0 overflow-hidden rounded-[24px]">
                <div className="absolute top-[-10%] left-[-5%] w-48 h-48 rounded-full bg-white/20 blur-[80px]" />
                <div className="absolute bottom-[-15%] right-[-10%] w-64 h-64 rounded-full bg-white/15 blur-[100px]" />
                <div className="absolute top-[20%] right-[5%] w-40 h-40 rounded-full bg-[#EFF6FF]/25 blur-[60px]" />
                <div className="absolute bottom-[10%] left-[10%] w-32 h-32 rounded-full bg-white/20 blur-[50px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#93C5FD]/10 to-transparent" />
              </div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-white/90 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-500">
                    <span className="material-symbols-outlined text-[32px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
                  </div>
                  <h3 className="text-[20px] font-extrabold text-[#374151] tracking-tight leading-tight">
                    이번 달도 힘차게 출근!
                  </h3>
                </div>
                <span className="px-8 py-2 rounded-xl bg-white/60 backdrop-blur-sm border border-white/60">
                  <p className="text-[13px] text-[#475569] leading-relaxed max-w-[360px] font-semibold tracking-normal">
                    쾌적한 주차 환경이 임직원 여러분을 기다리고 있습니다.<br />
                    <span className="text-[12px] text-[#64748B]">오늘도 안전 운전하세요!</span>
                  </p>
                </span>
              </div>
              <div className="absolute inset-0 border border-white/40 rounded-[24px] pointer-events-none z-20" />
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-[16px] md:text-[18px] font-bold text-text-main mb-4">
            나의 신청 이력
            <span className="ml-2 text-[13px] font-normal text-text-sub align-middle">
              * 신청결과 : <span className="text-badge-completed-text">배정완료</span> — 월정기 주차가 배정된 상태
              <span className="mx-1">/</span>
              <span className="text-badge-rejected-text">반려</span> — 정원 초과 및 요건 미달로 거절된 상태
              <span className="mx-1">/</span>
              <span className="text-badge-pending-text">대기</span> — 승인 대기 중인 상태
              <span className="mx-1">/</span>
              <span className="text-badge-inactive-text">-</span> — 작성중은 결과 없음
            </span>
          </h2>
          {/* Desktop table */}
          <div className="bento-card overflow-hidden hidden md:block">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FF] border-b border-outline-variant text-[13px] text-text-sub font-semibold">
                    <th className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1">
                        참여상태
                        <button onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setHelpPos({ top: r.bottom + 4, left: r.left }); setHelpPopup(helpPopup === 'participation' ? null : 'participation'); }} className="material-symbols-outlined text-[14px] text-text-sub hover:text-primary">help_outline</button>
                      </span>
                    </th>
                    <th className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1">
                        신청결과
                        <button onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setHelpPos({ top: r.bottom + 4, left: r.left }); setHelpPopup(helpPopup === 'result' ? null : 'result'); }} className="material-symbols-outlined text-[14px] text-text-sub hover:text-primary">help_outline</button>
                      </span>
                    </th>
                    <th className="px-6 py-3.5">제목</th>
                    <th className="px-6 py-3.5">기간</th>
                    <th className="px-6 py-3.5">작성자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-[14px]">
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-text-sub">최근 주차 신청 이력이 없습니다.</td>
                    </tr>
                  ) : applications.map((a) => (
                    <tr key={a.id} className="hover:bg-[#F8F9FF] transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${a.status === 'approved' ? 'bg-badge-completed-bg text-badge-completed-text' : a.status === 'submitted' ? 'bg-badge-pending-bg text-badge-pending-text' : a.status === 'rejected' ? 'bg-badge-rejected-bg text-badge-rejected-text' : 'bg-badge-pending-bg text-badge-pending-text'}`}>{a.status === 'draft' ? '작성중' : '참여완료'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${a.status === 'approved' ? 'bg-badge-completed-bg text-badge-completed-text' : a.status === 'rejected' ? 'bg-badge-rejected-bg text-badge-rejected-text' : a.status === 'draft' ? 'bg-badge-inactive-bg text-badge-inactive-text' : 'bg-badge-pending-bg text-badge-pending-text'}`}>{a.status === 'approved' ? '배정완료' : a.status === 'rejected' ? '반려' : a.status === 'draft' ? '-' : '대기'}</span>
                      </td>
                      <td className="px-6 py-4 font-medium">{a.template_title}</td>
                      <td className="px-6 py-4 text-text-sub">{a.start_date} ~ {a.end_date}</td>
                      <td className="px-6 py-4 text-text-sub">{user?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Mobile card list */}
          <div className="block md:hidden space-y-3">
            {applications.length === 0 ? (
              <div className="bento-card p-8 text-center text-sm text-text-sub">최근 주차 신청 이력이 없습니다.</div>
            ) : applications.map((a) => (
              <div key={a.id} className="bento-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${a.status === 'approved' ? 'bg-badge-completed-bg text-badge-completed-text' : a.status === 'submitted' ? 'bg-badge-pending-bg text-badge-pending-text' : a.status === 'rejected' ? 'bg-badge-rejected-bg text-badge-rejected-text' : 'bg-badge-pending-bg text-badge-pending-text'}`}>{a.status === 'draft' ? '작성중' : '참여완료'}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${a.status === 'approved' ? 'bg-badge-completed-bg text-badge-completed-text' : a.status === 'rejected' ? 'bg-badge-rejected-bg text-badge-rejected-text' : a.status === 'draft' ? 'bg-badge-inactive-bg text-badge-inactive-text' : 'bg-badge-pending-bg text-badge-pending-text'}`}>{a.status === 'approved' ? '배정완료' : a.status === 'rejected' ? '반려' : a.status === 'draft' ? '-' : '대기'}</span>
                </div>
                <p className="font-bold text-sm">{a.template_title}</p>
                <div className="flex justify-between text-xs text-text-sub">
                  <span>{a.start_date} ~ {a.end_date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
        {helpPopup === 'participation' && (
          <div style={{ position: 'fixed', top: helpPos.top, left: helpPos.left }} className="bg-white rounded-lg border border-outline-variant shadow-lg p-3 z-[9999] min-w-[200px]" onClick={e => e.stopPropagation()}>
            <div className="space-y-2 text-xs">
              <div><span className="font-bold text-text">작성중</span> <span className="text-text-sub">— 임시저장 상태</span></div>
              <div><span className="font-bold text-text">참여완료</span> <span className="text-text-sub">— 최종 제출 완료</span></div>
            </div>
          </div>
        )}
        {helpPopup === 'result' && (
          <div style={{ position: 'fixed', top: helpPos.top, left: helpPos.left }} className="bg-white rounded-lg border border-outline-variant shadow-lg p-3 z-[9999] min-w-[220px]" onClick={e => e.stopPropagation()}>
            <div className="space-y-2 text-xs">
              <div><span className="font-bold text-badge-completed-text">배정완료</span> <span className="text-text-sub">— 월정기 주차가 배정된 상태</span></div>
              <div><span className="font-bold text-badge-rejected-text">반려</span> <span className="text-text-sub">— 정원 초과 및 요건 미달로 거절된 상태</span></div>
              <div><span className="font-bold text-badge-pending-text">대기</span> <span className="text-text-sub">— 승인 대기 중인 상태</span></div>
              <div><span className="font-bold text-badge-inactive-text">-</span> <span className="text-text-sub">— 작성중(임시저장)은 결과 없음</span></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
