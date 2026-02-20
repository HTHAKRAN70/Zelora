import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../services/api.js";
import { setCredentials } from "../store/authSlice.js";

function SignupForm({ setMode }) {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api
      .post("/auth/register", formData)
      .then((res) => {
        const { token, user } = res.data;
        if (token) {
          dispatch(setCredentials({ token, user: user ?? { name: formData.name, email: formData.email } }));
          navigate("/home", { replace: true });
        } else {
          setMode("login");
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || "Registration failed.";
        alert(msg);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
          Create account
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Register to get access to the main site.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Full name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-70"
        >
          {loading ? "Signing up…" : "Sign up"}
        </button>
      </form>

      <p className="text-sm text-center text-gray-600">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => setMode("login")}
          className="font-semibold text-black hover:underline"
        >
          Log in
        </button>
      </p>
    </div>
  );
}

export default SignupForm;

