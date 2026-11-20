// D:/SWP391/SWP391/client/src/components/layout/SiteLayout.jsx
// Bố cục chung cho các trang người dùng: header, nội dung (Outlet), footer, chatbox
// và luồng bắt buộc chọn chế độ ăn trước khi sử dụng.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import WelcomeModal from '../../features/diet/components/WelcomeModal.jsx';
import ChatBox from '../../features/chat/components/ChatBox.jsx';
import SiteStatus from '../common/SiteStatus.jsx';
import { useDietSelection } from '../../features/diet/hooks/useDietSelection.js';
import { useDatabase } from '../../hooks/useDatabase.js';

// Component layout ngoài: chờ catalog tải xong; nếu chưa có dữ liệu thì hiện màn hình trạng thái.
export default function SiteLayout() {
  const {data,error,reload}=useDatabase();
  if(!data)return <SiteStatus error={error} onRetry={() => reload().catch(() => {})} />;
  return <>{error&&<div className="alert alert-warning m-3" role="alert">{error} <button className="btn btn-sm btn-outline-success" onClick={()=>reload().catch(()=>{})}>Thử lại</button></div>}<LoadedSiteLayout data={data} /></>;
}

// Layout khi đã có catalog: quản lý chế độ ăn, bài đăng cá nhân và các URL xem trước tệp đính kèm.
function LoadedSiteLayout({data}) {
  const { diet, pickerOpen, openPicker, confirm, identityRevision } = useDietSelection(data.diets);
  const { user, userLoading, userError, refreshUser } = useDatabase();
  const [personalPosts, setPersonalPosts] = useState([]);
  // Theo dõi các object URL đã tạo để thu hồi khi không dùng nữa, tránh rò rỉ bộ nhớ.
  const mediaUrls = useRef(new Set());
  // Tạo tệp đính kèm xem trước từ File người dùng chọn (ảnh hoặc video).
  const createPostAttachment = useCallback((file) => {
    const url = URL.createObjectURL(file);
    mediaUrls.current.add(url);
    return {
      id: crypto.randomUUID(),
      url,
      name: file.name,
      type: file.type.startsWith('video/') ? 'video' : 'image',
    };
  }, []);
  // Thu hồi một object URL khi tệp đính kèm bị gỡ bỏ.
  const releasePostAttachment = useCallback((url) => {
    if (mediaUrls.current.delete(url)) URL.revokeObjectURL(url);
  }, []);
  // Thu hồi toàn bộ object URL còn lại khi layout unmount.
  useEffect(() => {
    const urls = mediaUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);
  const dietName = diet?.name || 'Chưa chọn chế độ ăn';
  // Người dùng đã đăng nhập nhưng hồ sơ (chứa chế độ ăn đã lưu) chưa tải xong hoặc lỗi thì chưa thể hiển thị trang.
  if (user && !diet && (userLoading || userError)) {
    return <SiteStatus error={userError} onRetry={refreshUser} />;
  }

  // Chưa chọn chế độ ăn thì chỉ hiện nền trống và bắt buộc mở WelcomeModal; key theo identityRevision để reset khi đổi tài khoản.
  return (
    <div
      className="home-page min-vh-100 d-flex flex-column"
      data-bs-theme="light"
    >
      {diet ? (
        <>
          <Header
            dietName={dietName}
            onChangeDiet={openPicker}
          />
          <div id="main-content" className="cx-main-content" tabIndex={-1}><Outlet
            context={{
              diet,
              dietName,
              personalPosts,
              setPersonalPosts,
              createPostAttachment,
              releasePostAttachment,
            }}
          /></div>
          <Footer />
          <ChatBox dietName={dietName} dietTypeId={diet?.diet_type_id} />
        </>
      ) : (
        <main
          className="cx-onboarding-stage"
          aria-label="Chọn loại ăn chay trước khi vào ChayXanh"
        />
      )}
      {(pickerOpen || !diet) && (
        <WelcomeModal key={identityRevision} options={data.diets} initialDietId={diet?.diet_type_id} onConfirm={confirm} />
      )}
    </div>
  );
}
