import { useState } from "react";

function ForgotPassword({ setMode }) {
  const [formData, setFormData] = useState({
    email: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: send reset instructions / OTP with formData
    console.log("Forgot password data:", formData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
          Forgot password
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter your registered email, we&apos;ll help you reset it.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
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

        <button
          type="submit"
          className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
        >
          Continue
        </button>
      </form>

      <p className="text-sm text-center text-gray-600">
        Remembered your password?{" "}
        <button
          type="button"
          onClick={() => setMode("login")}
          className="font-semibold text-black hover:underline"
        >
          Back to login
        </button>
      </p>
    </div>
  );
}

export default ForgotPassword;

