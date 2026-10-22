// client/src/features/profile/components/ProfileForm.jsx
import { Link } from 'react-router';
import { Button, Spinner } from 'react-bootstrap';
import { normalizeSearch } from '../../../utils/recipeFilters.js';
import { todayKey } from '../../../utils/journal.js';
import { useProfileForm } from '../hooks/useProfileForm.js';

export default function ProfileForm({ userId, catalog }) {
  const { account, values, setValues, error, notice, setNotice, busy, setRetry, search, setSearch, change, save } = useProfileForm({ userId });

  if (!values) {
    return (
      <main className="cx-profile-page">
        <div className="cx-profile-shell text-center py-5">
          <h1>Hồ sơ cá nhân</h1>
          <p role={error ? 'alert' : 'status'}>{error || 'Đang tải hồ sơ…'}</p>
          {error && (
            <button className="btn btn-success" onClick={() => setRetry((count) => count + 1)}>
              Thử lại
            </button>
          )}
        </div>
      </main>
    );
  }

  const ingredients = (catalog?.ingredients || []).filter((ingredient) =>
    normalizeSearch(ingredient.name).includes(normalizeSearch(search.trim()))
  );

  return (
    <main className="cx-profile-page flex-grow-1">
      <div className="cx-profile-shell">
        <header className="cx-profile-heading">
          <span>
            <i className="bi bi-person-circle" aria-hidden="true" />
          </span>
          <div>
            <h1>Hồ sơ cá nhân</h1>
            <p>Cập nhật thông tin cá nhân, chế độ ăn và nguyên liệu dị ứng của bạn.</p>
          </div>
          <Link to="/nhat-ky" className="btn btn-outline-success">
            Xem nhật ký
          </Link>
        </header>

        <form onSubmit={save}>
          <fieldset disabled={busy} className="cx-profile-fields">
            <section className="cx-profile-section">
              <h2>Thông tin tài khoản</h2>
              <div className="cx-profile-grid">
                <label>
                  Họ và tên
                  <input
                    name="full_name"
                    value={values.full_name}
                    onChange={change}
                    required
                    maxLength={255}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Email
                  <input value={account?.email || ''} readOnly type="email" autoComplete="email" />
                </label>
              </div>
              <div className="cx-profile-account-meta">
                <span>Mã tài khoản: {account?.user_id}</span>
                <span>Trạng thái: {account?.status}</span>
                {account?.created_at && (
                  <span>
                    Ngày tham gia:{' '}
                    {new Date(account.created_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' })}
                  </span>
                )}
              </div>
            </section>

            <section className="cx-profile-section">
              <h2>Thông tin chi tiết</h2>
              <div className="cx-profile-grid">
                <label>
                  Ngày sinh
                  <input
                    name="dob"
                    type="date"
                    value={values.dob}
                    onChange={change}
                    max={todayKey()}
                    autoComplete="bday"
                  />
                </label>
                <label>
                  Giới tính
                  <select name="gender" value={values.gender} onChange={change} autoComplete="sex">
                    <option value="">Chưa chọn</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </label>
                <label>
                  Chiều cao (cm)
                  <input
                    name="height"
                    type="number"
                    value={values.height}
                    onChange={change}
                    min={50}
                    max={250}
                    step="0.1"
                  />
                </label>
                <label>
                  Cân nặng (kg)
                  <input
                    name="weight"
                    type="number"
                    value={values.weight}
                    onChange={change}
                    min={10}
                    max={400}
                    step="0.1"
                  />
                </label>
                <label>
                  Chế độ ăn
                  <select name="diet_type_id" value={values.diet_type_id} onChange={change}>
                    <option value="">Chưa chọn</option>
                    {(catalog?.diets || []).map((diet) => (
                      <option key={diet.diet_type_id} value={diet.diet_type_id}>
                        {diet.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Mục tiêu sức khỏe
                  <input
                    name="health_goal"
                    value={values.health_goal}
                    onChange={change}
                    maxLength={255}
                  />
                </label>
              </div>
            </section>

            <section className="cx-profile-section">
              <div className="cx-profile-section-heading">
                <h2>Nguyên liệu dị ứng</h2>
                <span>Đã chọn {values.allergy_ids.length}</span>
              </div>
              <label className="cx-profile-search">
                Tìm nguyên liệu
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <div className="cx-profile-allergies">
                {ingredients.map((ingredient) => (
                  <label key={ingredient.ingredient_id}>
                    <input
                      type="checkbox"
                      checked={values.allergy_ids.includes(ingredient.ingredient_id)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setValues((previous) => ({
                          ...previous,
                          allergy_ids: checked
                            ? [...previous.allergy_ids, ingredient.ingredient_id]
                            : previous.allergy_ids.filter((id) => id !== ingredient.ingredient_id),
                        }));
                        setNotice('');
                      }}
                    />
                    <span>{ingredient.name}</span>
                  </label>
                ))}
              </div>
              {!ingredients.length && (
                <p className="text-secondary mb-0">Không tìm thấy nguyên liệu.</p>
              )}
            </section>
          </fieldset>

          {error && (
            <p className="alert alert-danger" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="alert alert-success" role="status">
              {notice}
            </p>
          )}

          <div className="cx-profile-actions">
            <p>Có thể bổ sung sau. BMI cần chiều cao và cân nặng.</p>
            <Button as={Link} to="/" variant="outline-success">Về trang chủ</Button>
            <Button type="submit" variant="success" disabled={busy}>
              {busy && <Spinner size="sm" animation="border" className="me-2" aria-hidden="true" />}
              {busy ? 'Đang lưu…' : 'Lưu thông tin'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
