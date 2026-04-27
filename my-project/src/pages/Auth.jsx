import { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import ForgotPassword from "./ForgotPassword";

import bgImage from "../assets/background.jpg";
import analyticsImage from "../assets/analytics.jpg";

export default function AuthPage() {
  const [mode, setMode] = useState("login");

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-6"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* MAIN FIXED-SIZE CARD */}
      <div className="w-full max-w-5xl h-[600px] bg-white rounded-2xl shadow-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden">

        {/* LEFT – CONTENT */}
        <div className="flex flex-col px-10 py-10">

          {/* FIXED HEADER */}
          <div className="mb-8 flex ">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to <span className="text-black">Zelora</span>
            </h1>
          </div>

          {/* SCROLLABLE FORM AREA */}
          <div className="flex-1 overflow-y-auto pr-2">
            {mode === "login" && <LoginForm setMode={setMode} />}
            {mode === "signup" && <SignupForm setMode={setMode} />}
            {mode === "forgot" && <ForgotPassword setMode={setMode} />}
          </div>

        </div>

        {/* RIGHT – IMAGE (FIXED) */}
        <div className="hidden md:flex items-center justify-center bg-gray-900">
          <img
            src={analyticsImage}
            alt="Analytics"
            className="w-[85%] object-contain"
          />
        </div>

      </div>
    </div>
  );
}
