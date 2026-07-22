import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function UserHeader({ user: propName }) {
  const navigate = useNavigate();
  const { user: authUser, logout, isAdmin } = useAuth();
  return (
    <header className="fixed top-0 w-full h-[64px] glass-effect border-b border-outline-variant z-50">
      <div className="flex justify-between items-center px-gutter h-full max-w-max-width mx-auto">
        <div className="flex items-center gap-12 h-full">
          <Link to="/" className="flex items-center text-[20px] tracking-tight">
            <span className="font-bold text-[#171C1F] hidden sm:inline">주차</span>
            <span className="font-extrabold text-secondary">ON</span>
          </Link>
          <nav className="hidden md:flex gap-8 items-center h-full">
            <Link
              className="text-primary font-semibold border-b-2 border-primary h-full flex items-center px-1"
              to="/"
            >
              주차 신청
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <>
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1D4ED8] text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                <span>관리자 메뉴</span>
              </button>
              <div className="w-px h-4 bg-outline-variant"></div>
            </>
          )}
          <Link to="/mypage" className="flex items-center gap-2 group">
            <span className="text-sm font-medium text-text-main group-hover:text-primary">
              {authUser?.name || propName}
            </span>
          </Link>
          <button onClick={logout} className="flex items-center gap-1 text-sm text-text-sub hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="text-xs font-medium">로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  );
}
