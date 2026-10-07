import { useState } from 'react';

import Header from '../components/Header.jsx';
import HomeMain from '../components/HomeMain.jsx';
import Footer from '../components/Footer.jsx';
import WelcomeModal from '../components/WelcomeModal.jsx';
import { getSavedDiet } from '../lib/dietSelection.js';

export default function Home() {
  const [diet, setDiet] = useState(getSavedDiet);
  const accessGranted = Boolean(diet);
  const [dietPickerOpen, setDietPickerOpen] = useState(() => !diet);
  const dietName = diet?.name || 'Chưa chọn chế độ ăn';

  function handleDietConfirm(diet) {
    setDiet(diet);
    setDietPickerOpen(false);
  }

  return (
    <div
      className="home-page min-vh-100 d-flex flex-column"
      data-bs-theme="light"
    >
      {accessGranted ? (
        <>
          <Header dietName={dietName} onChangeDiet={() => setDietPickerOpen(true)} />
          <HomeMain dietName={dietName} />
          <Footer />
        </>
      ) : (
        <main className="cx-onboarding-stage" aria-label="Chọn loại ăn chay trước khi vào ChayXanh" />
      )}

      {dietPickerOpen && (
        <WelcomeModal onConfirm={handleDietConfirm} />
      )}
    </div>
  );
}
