// D:/SWP391/SWP391/client/src/components/layout/SiteLayout.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import WelcomeModal from '../../features/diet/components/WelcomeModal.jsx';
import ChatBox from '../../features/chat/components/ChatBox.jsx';
import SiteStatus from '../common/SiteStatus.jsx';
import { useDietSelection } from '../../features/diet/hooks/useDietSelection.js';
import { useDatabase } from '../../hooks/useDatabase.js';

export default function SiteLayout() {
  const {data,error,reload}=useDatabase();
  if(!data)return <SiteStatus error={error} onRetry={() => reload().catch(() => {})} />;
  return <>{error&&<div className="alert alert-warning m-3" role="alert">{error} <button className="btn btn-sm btn-outline-success" onClick={()=>reload().catch(()=>{})}>Thử lại</button></div>}<LoadedSiteLayout data={data} /></>;
}

function LoadedSiteLayout({data}) {
  const { diet, pickerOpen, openPicker, confirm, identityRevision } = useDietSelection(data.diets);
  const { user, userLoading, userError, refreshUser } = useDatabase();
  const [personalPosts, setPersonalPosts] = useState([]);
  const mediaUrls = useRef(new Set());
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
  const releasePostAttachment = useCallback((url) => {
    if (mediaUrls.current.delete(url)) URL.revokeObjectURL(url);
  }, []);
  useEffect(() => {
    const urls = mediaUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);
  const dietName = diet?.name || 'Chưa chọn chế độ ăn';
  if (user && !diet && (userLoading || userError)) {
    return <SiteStatus error={userError} onRetry={refreshUser} />;
  }

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
