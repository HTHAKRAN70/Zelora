import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { setCredentials } from "../store/authSlice";

export default function LoginForm({ setMode }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    api
      .post("/auth/login", formData)
      .then((res) => {
        console.log("Login response:", res);
        const { token, userData } = res.data;
        dispatch(setCredentials({ token, userData }));
        navigate("/home", { replace: true });
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Login failed");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
          Login Here 👋
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Login to continue to Zelora.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
            required
          />
        </div>

        <div className="flex justify-between text-sm">
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="text-black font-medium hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-900 transition disabled:opacity-70"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-center text-gray-600">
        Don&apos;t have an account?{" "}
        <button
          onClick={() => setMode("signup")}
          className="font-semibold text-black hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );
}
