// client/src/features/auth/components/AuthForm.jsx
import { useState } from 'react';
import { Spinner } from 'react-bootstrap';
import AuthHeader from './AuthHeader.jsx';
import { Link, useNavigate } from 'react-router';
import { api } from '../../../services/api.js';
import { setSession } from '../../../utils/session.js';
import { getAuthDestination } from '../utils/authRedirect.js';

export default function AuthForm({ isRegister = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [busy,setBusy]=useState(false);
  const navigate=useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    if(busy)return;
    const form=new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await api(`/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        body: {
          email: form.get('email') || form.get('account'),
          password: form.get('password'),
          ...(isRegister ? { full_name: form.get('full_name') } : {}),
        },
      });
      setSession({ token: result.token, user: result.user });
      navigate(getAuthDestination({ user: result.user, isRegister }), { replace: true });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="cx-auth-page min-vh-100 bg-success bg-opacity-10 d-flex align-items-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
            <section className="card border-0 rounded-4 shadow-lg overflow-hidden">
              <AuthHeader isRegister={isRegister} />

              <div className="card-body p-4">
                <form onSubmit={handleSubmit} onChange={() => setMessage('')} aria-busy={busy}>
                  {isRegister && (
                    <div className="mb-4">
                      <label
                        htmlFor="fullName"
                        className="form-label small fw-semibold"
                      >
                        Họ và tên
                      </label>

                      <div className="input-group border rounded-3 overflow-hidden">
                        <span className="input-group-text bg-white border-0 text-secondary">
                          <i className="bi bi-person" aria-hidden="true"></i>
                        </span>

                        <input
                          id="fullName"
                          name="full_name"
                          type="text"
                          className="form-control border-0 py-3"
                          placeholder="Nhập họ và tên của bạn"
                          autoComplete="name"
                          maxLength={255}
                          required
                          pattern=".*\S.*"
                          title="Vui lòng nhập họ và tên."
                        />
                      </div>
                    </div>
                  )}

                  {/* Email hoặc tên đăng nhập */}
                  <div className="mb-4">
                    <label
                      htmlFor="account"
                      className="form-label small fw-semibold"
                    >
                      Email
                    </label>

                    <div className="input-group border rounded-3 overflow-hidden">
                      <span className="input-group-text bg-white border-0 text-secondary">
                        <i className="bi bi-envelope" aria-hidden="true"></i>
                      </span>

                      <input
                        id="account"
                        name="email"
                        type="email"
                        maxLength={255}
                        className="form-control border-0 py-3"
                        placeholder="Nhập email của bạn"
                        autoComplete={isRegister ? 'email' : 'username'}
                        title="Vui lòng nhập email hợp lệ."
                        required
                      />
                    </div>
                  </div>

                  {/* Mật khẩu */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-baseline gap-2">
                      <label
                        htmlFor="password"
                        className="form-label small fw-semibold"
                      >
                        Mật khẩu
                      </label>

                      {!isRegister && (
                        <button
                          type="button"
                          className="btn btn-link text-success text-decoration-none p-0 small"
                          onClick={() =>
                            setMessage('Chưa kết nối chức năng quên mật khẩu.')
                          }
                        >
                          Quên mật khẩu?
                        </button>
                      )}
                    </div>

                    <div className="input-group border rounded-3 overflow-hidden">
                      <span className="input-group-text bg-white border-0 text-secondary">
                        <i className="bi bi-lock-fill" aria-hidden="true"></i>
                      </span>

                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-control border-0 py-3"
                        placeholder={
                          isRegister ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'
                        }
                        autoComplete={
                          isRegister ? 'new-password' : 'current-password'
                        }
                        minLength={isRegister ? 8 : undefined}
                        maxLength={128}
                        required
                      />

                      <button
                        type="button"
                        className="btn bg-white border-0 text-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                        }
                        aria-pressed={showPassword}
                      >
                        <i
                          className={
                            showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'
                          }
                          aria-hidden="true"
                        ></i>
                      </button>
                    </div>
                  </div>

                  {/* Checkbox */}
                  <div className="form-check mb-4">
                    <input
                      id="agreement"
                      name={isRegister ? 'agreement' : 'remember'}
                      type="checkbox"
                      className="form-check-input"
                      required={isRegister}
                    />

                    <label
                      htmlFor="agreement"
                      className="form-check-label small text-secondary"
                    >
                      {isRegister ? (
                        <>
                          Tôi đồng ý với{' '}
                          <button
                            type="button"
                            className="btn btn-link text-success text-decoration-none fw-semibold p-0 small"
                            onClick={() =>
                              setMessage(
                                'Điều khoản dịch vụ sẽ được bổ sung sau.'
                              )
                            }
                          >
                            Điều khoản dịch vụ
                          </button>
                          {' & '}
                          <button
                            type="button"
                            className="btn btn-link text-success text-decoration-none fw-semibold p-0 small"
                            onClick={() =>
                              setMessage(
                                'Chính sách bảo mật sẽ được bổ sung sau.'
                              )
                            }
                          >
                            Chính sách bảo mật
                          </button>
                        </>
                      ) : (
                        'Ghi nhớ đăng nhập'
                      )}
                    </label>
                  </div>

                  {message && (
                    <div className="alert alert-info small" role="status">
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="btn btn-success bg-gradient w-100 py-3 rounded-3 fw-semibold shadow-sm"
                  >
                    {busy && <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />}
                    <span role="status">{busy ? 'Đang xử lý…' : isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Ngay'}</span>
                  </button>
                </form>
              </div>

              <footer className="text-center bg-success bg-opacity-10 p-3 small">
                Trở về{' '}
                <Link
                  to="/"
                  className="text-success fw-semibold text-decoration-none"
                >
                  Trang chủ Cộng Đồng Chay Xanh
                </Link>
              </footer>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
