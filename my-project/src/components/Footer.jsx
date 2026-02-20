import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="shrink-0 bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            © {currentYear} Zelora. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/home/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
            <Link to="/home/support" className="hover:text-white transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
