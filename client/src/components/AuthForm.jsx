import { useState } from "react";
import { Link } from "react-router";

export default function AuthForm({ isRegister = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    setMessage(
      isRegister
        ? "Thông tin hợp lệ. Bản mẫu chưa tạo tài khoản thật."
        : "Bản mẫu giao diện, chưa xác thực đăng nhập."
    );
  }

  return (
    <main className="min-vh-100 bg-success bg-opacity-10 d-flex align-items-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
            <section className="card border-0 rounded-4 shadow-lg overflow-hidden">
              {/* Phần đầu */}
              <header className="bg-success bg-gradient text-white text-center p-4">
                <div className="d-inline-flex bg-white bg-opacity-25 rounded-4 p-3 mb-3">
                  <i
                    className="bi bi-flower1 fs-2"
                    aria-hidden="true"
                  ></i>
                </div>

                <h1 className="h3 fw-bold">Cộng Đồng Chay Xanh</h1>

                <p className="small text-white-50">
                  Dinh dưỡng lành mạnh &amp; Sống xanh toàn diện
                </p>

                <nav
                  className="d-flex gap-2 bg-dark bg-opacity-10 rounded-3 p-1 mt-4"
                  aria-label="Tài khoản"
                >
                  <Link
                    to="/dang-nhap"
                    className={`btn fw-semibold flex-fill ${
                      !isRegister
                        ? "bg-white text-success"
                        : "text-white"
                    }`}
                    aria-current={!isRegister ? "page" : undefined}
                  >
                    Đăng Nhập
                  </Link>

                  <Link
                    to="/dang-ky"
                    className={`btn fw-semibold flex-fill ${
                      isRegister
                        ? "bg-white text-success"
                        : "text-white"
                    }`}
                    aria-current={isRegister ? "page" : undefined}
                  >
                    Đăng Ký
                  </Link>
                </nav>
              </header>

              {/* Nội dung form */}
              <div className="card-body p-4">
                <form
                  onSubmit={handleSubmit}
                  onChange={() => setMessage("")}
                >
                  {/* Họ tên chỉ xuất hiện khi đăng ký */}
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
                          placeholder="Nguyễn Văn A"
                          autoComplete="name"
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
                      {isRegister ? "Email" : "Email hoặc Tên đăng nhập"}
                    </label>

                    <div className="input-group border rounded-3 overflow-hidden">
                      <span className="input-group-text bg-white border-0 text-secondary">
                        <i className="bi bi-envelope" aria-hidden="true"></i>
                      </span>

                      <input
                        id="account"
                        name={isRegister ? "email" : "username"}
                        type={isRegister ? "email" : "text"}
                        className="form-control border-0 py-3"
                        placeholder="nhapemail@gmail.com"
                        autoComplete={isRegister ? "email" : "username"}
                        pattern={isRegister ? undefined : ".*\\S.*"}
                        title="Vui lòng nhập email hoặc tên đăng nhập."
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
                            setMessage(
                              "Chưa kết nối chức năng quên mật khẩu."
                            )
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
                        type={showPassword ? "text" : "password"}
                        className="form-control border-0 py-3"
                        placeholder={
                          isRegister ? "Ít nhất 6 ký tự" : "Nhập mật khẩu"
                        }
                        autoComplete={
                          isRegister ? "new-password" : "current-password"
                        }
                        minLength={isRegister ? 6 : undefined}
                        required
                      />

                      <button
                        type="button"
                        className="btn bg-white border-0 text-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                        }
                        aria-pressed={showPassword}
                      >
                        <i
                          className={
                            showPassword
                              ? "bi bi-eye-slash"
                              : "bi bi-eye"
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
                      name={isRegister ? "agreement" : "remember"}
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
                          Tôi đồng ý với{" "}
                          <button
                            type="button"
                            className="btn btn-link text-success text-decoration-none fw-semibold p-0 small"
                            onClick={() =>
                              setMessage(
                                "Điều khoản dịch vụ sẽ được bổ sung sau."
                              )
                            }
                          >
                            Điều khoản dịch vụ
                          </button>
                          {" & "}
                          <button
                            type="button"
                            className="btn btn-link text-success text-decoration-none fw-semibold p-0 small"
                            onClick={() =>
                              setMessage(
                                "Chính sách bảo mật sẽ được bổ sung sau."
                              )
                            }
                          >
                            Chính sách bảo mật
                          </button>
                        </>
                      ) : (
                        "Ghi nhớ đăng nhập"
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
                    className="btn btn-success bg-gradient w-100 py-3 rounded-3 fw-semibold shadow-sm"
                  >
                    {isRegister
                      ? "Đăng Ký Tài Khoản"
                      : "Đăng Nhập Ngay"}
                  </button>
                </form>
              </div>

              <footer className="text-center bg-success bg-opacity-10 p-3 small">
                Trở về{" "}
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
