import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="text-6xl font-black text-primary mb-2">404</h1>
        <p className="text-lg font-bold text-text mb-6">페이지를 찾을 수 없습니다</p>
        <p className="text-sm text-text-sub mb-8">요청하신 페이지가 존재하지 않거나 삭제되었습니다.</p>
        <Link to="/" className="inline-flex items-center gap-1 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined text-sm">home</span>
          홈으로 가기
        </Link>
      </div>
    </div>
  );
}
