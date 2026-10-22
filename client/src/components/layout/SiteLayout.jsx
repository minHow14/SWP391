// client/src/components/layout/SiteLayout.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import WelcomeModal from '../../features/diet/components/WelcomeModal.jsx';
import ChatBox from '../../features/chat/components/ChatBox.jsx';
import SiteStatus from '../common/SiteStatus.jsx';
import { getSavedDiet } from '../../utils/dietSelection.js';
import { useDatabase } from '../../hooks/useDatabase.js';

const DIET_REQUIRED_PATHS = new Set(['/cong-thuc', '/kiem-tra-mon']);

export default function SiteLayout() {
  const {data,error,reload}=useDatabase();
  if(!data)return <SiteStatus error={error} onRetry={() => reload().catch(() => {})} />;
  return <>{error&&<div className="alert alert-warning m-3" role="alert">{error} <button className="btn btn-sm btn-outline-success" onClick={()=>reload().catch(()=>{})}>Thử lại</button></div>}<LoadedSiteLayout data={data} /></>;
}

function LoadedSiteLayout({data}) {
  const needsDietChoice = DIET_REQUIRED_PATHS.has(useLocation().pathname);
  const [diet, setDiet] = useState(() => getSavedDiet(data?.diets));
  const [dietPickerOpen, setDietPickerOpen] = useState(false);
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

  return (
    <div
      className="home-page min-vh-100 d-flex flex-column"
      data-bs-theme="light"
    >
      {diet || !needsDietChoice ? (
        <>
          <Header
            dietName={dietName}
            onChangeDiet={() => setDietPickerOpen(true)}
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
      {(dietPickerOpen || (!diet && needsDietChoice)) && (
        <WelcomeModal options={data.diets}
          onConfirm={(selection) => {
            setDiet(selection);
            setDietPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
