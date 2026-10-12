import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import WelcomeModal from './WelcomeModal.jsx';
import ChatBox from './ChatBox.jsx';
import { getSavedDiet } from '../lib/dietSelection.js';
import { useDatabase } from '../lib/databaseContext.js';
import '../Home.css';
import '../Explore.css';

export default function SiteLayout() {
  const {data,error,reload}=useDatabase();
  if(!data)return <main className="p-5 text-center"><h1 className="h4">{error?'Không thể tải dữ liệu':'Đang tải dữ liệu ChayXanh…'}</h1>{error&&<><p>{error}</p><button className="btn btn-success" onClick={()=>reload().catch(()=>{})}>Thử lại</button></>}</main>;
  return <>{error&&<div className="alert alert-warning m-3" role="alert">{error} <button className="btn btn-sm btn-outline-success" onClick={()=>reload().catch(()=>{})}>Thử lại</button></div>}<LoadedSiteLayout data={data} /></>;
}

function LoadedSiteLayout({data}) {
  const [diet, setDiet] = useState(() => getSavedDiet(data?.diets));
  const [dietPickerOpen, setDietPickerOpen] = useState(() => !diet);
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
      {diet ? (
        <>
          <Header
            dietName={dietName}
            onChangeDiet={() => setDietPickerOpen(true)}
          />
          <Outlet
            context={{
              diet,
              dietName,
              personalPosts,
              setPersonalPosts,
              createPostAttachment,
              releasePostAttachment,
            }}
          />
          <Footer />
          <ChatBox dietName={dietName} />
        </>
      ) : (
        <main
          className="cx-onboarding-stage"
          aria-label="Chọn loại ăn chay trước khi vào ChayXanh"
        />
      )}
      {dietPickerOpen && (
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
