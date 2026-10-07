import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="border-top bg-white py-4">
      <div className="container d-flex flex-wrap justify-content-between gap-3">
        <span>© {new Date().getFullYear()} ChayXanh</span>
        <Link to="/" className="text-success text-decoration-none">
          Cộng Đồng Chay Xanh
        </Link>
      </div>
    </footer>
  );
}
