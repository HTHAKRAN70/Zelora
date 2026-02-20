import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
      <p className="text-slate-600 mb-4">The page you’re looking for doesn’t exist.</p>
      <Link to="/home" className="text-indigo-600 hover:text-indigo-700 font-medium">
        Back to Home
      </Link>
    </div>
  );
}
