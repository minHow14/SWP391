// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Profile.jsx
import { Link, Navigate, useSearchParams } from 'react-router';
import { useDatabase } from '../hooks/useDatabase.js';
import ProfileForm from '../features/profile/components/ProfileForm.jsx';
import ProfileSetupNotice from '../features/profile/components/ProfileSetupNotice.jsx';

export default function Profile() {
  const { user, data } = useDatabase();
  const [searchParams] = useSearchParams();
  const isSetup = searchParams.get('setup') === '1';

  if (user?.role === 1) return <Navigate to="/admin" replace />;
  if (!user) {
    return (
      <main className="cx-profile-page">
        <div className="cx-profile-shell text-center">
          <h1>Hồ sơ cá nhân</h1>
          <p>Đăng nhập để xem và cập nhật thông tin của bạn.</p>
          <Link className="btn btn-success" to="/dang-nhap">
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="cx-profile-page">
        <div className="cx-profile-shell text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-3 text-muted">Đang tải thông tin hồ sơ và danh mục...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      {isSetup && <div className="container pt-4"><ProfileSetupNotice /></div>}
      <ProfileForm key={user.user_id} userId={user.user_id} catalog={data} />
    </>
  );
}
