import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import logo from "../assets/logo.png";
import { logout, selectUser } from "../store/authSlice.js";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    dispatch(logout());
    navigate("/", { replace: true });
  };

  const initial = user?.name
    ? user.name.trim().charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <nav className="bg-slate-900 text-white shadow-lg shrink-0">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/home" className="flex items-center  hover:opacity-90 transition-opacity">
            <img src={logo} alt="Zelora" className="h-10 w-auto object-contain" />
            <span className="text-xl font-semibold tracking-tight">Zelora</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/home" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
              Home
            </Link>
            <Link to="/home/contact" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
              Contact
            </Link>
            <Link to="/home/support" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
              Support
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
                aria-expanded={open}
                aria-haspopup="true"
              >
                {initial}
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                  <Link
                    to="/home/profile"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-slate-700 hover:bg-slate-100 text-sm font-medium"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/home/forgot-password"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-slate-700 hover:bg-slate-100 text-sm font-medium"
                  >
                    Forgotten Password
                  </Link>
                  <div className="border-t border-slate-200 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
