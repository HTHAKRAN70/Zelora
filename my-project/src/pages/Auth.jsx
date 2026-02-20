// // // import { useState, useEffect } from "react";
// // // import { useNavigate } from "react-router-dom";
// // // import { useSelector } from "react-redux";
// // // import bg from "../assets/background.jpg";
// // // import sideImage from "../assets/analytics.jpg";
// // // import LoginForm from "./LoginForm.jsx";
// // // import SignupForm from "./SignupForm.jsx";
// // // import ForgotPassword from "./ForgotPassword.jsx";
// // // import { selectIsAuthenticated } from "../store/authSlice.js";

// // // function Login() {
// // //   const [mode, setMode] = useState("login");
// // //   const navigate = useNavigate();
// // //   const isAuthenticated = useSelector(selectIsAuthenticated);

// // //   useEffect(() => {
// // //     if (isAuthenticated) navigate("/home", { replace: true });
// // //   }, [isAuthenticated, navigate]);

// // //   if (isAuthenticated) return null;

// // //   return (
// // //     <div
// // //       className="min-h-screen bg-cover bg-center flex items-center justify-center px-4 sm:px-6 lg:px-8"
// // //       style={{ backgroundImage: `url(${bg})` }}
// // //     >
// // //       <div className="relative w-full max-w-5xl mx-4">
        
// // //         <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-2xl shadow-2xl" />


// // //         <div className="relative flex flex-col md:flex-row overflow-hidden rounded-2xl min-h-[440px] md:h-[480px]">
        
// // //           <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-10 flex flex-col justify-center">
// // //             {mode === "login" && <LoginForm setMode={setMode} />}
// // //             {mode === "signup" && <SignupForm setMode={setMode} />}
// // //             {mode === "forgot" && <ForgotPassword setMode={setMode} />}
// // //           </div>

// // //           <div className="hidden md:block md:w-1/2 h-full flex-none">
// // //             <img
// // //               src={sideImage}
// // //               alt="Analytics"
// // //               className="h-full w-full object-cover"
// // //             />
// // //           </div>
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // // export default Login;
// // import { useState } from "react";
// // import LoginForm from "./LoginForm";
// // import SignupForm from "./SignupForm";
// // import ForgotPassword from "./ForgotPassword";
// // import authImage from "../assets/analytics.jpg"; // your image

// // export default function AuthPage() {
// //   const [mode, setMode] = useState("login");

// //   return (
// //     <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      
// //       {/* LEFT SIDE – FORM */}
// //       <div className="flex items-center justify-center px-6 bg-gray-50">
// //         <div className="w-full max-w-md">
// //           {mode === "login" && <LoginForm setMode={setMode} />}
// //           {mode === "signup" && <SignupForm setMode={setMode} />}
// //           {mode === "forgot" && <ForgotPassword setMode={setMode} />}
// //         </div>
// //       </div>

// //       {/* RIGHT SIDE – IMAGE / BRAND */}
// //       <div className="hidden md:flex items-center justify-center bg-gray-900">
// //         <div className="text-center px-10">
// //           <img
// //             src={authImage}
// //             alt="Zelora"
// //             className="w-full max-w-md mx-auto mb-6"
// //           />
// //           <h2 className="text-3xl font-bold text-white">Welcome to Zelora</h2>
// //           <p className="mt-3 text-gray-300">
// //             Analyze, visualize, and connect your databases effortlessly.
// //           </p>
// //         </div>
// //       </div>

// //     </div>
// //   );
// // }
// import { useState } from "react";
// import LoginForm from "./LoginForm";
// import SignupForm from "./SignupForm";
// import ForgotPassword from "./ForgotPassword";

// import bgImage from "../assets/background.jpg";
// import analyticsImage from "../assets/analytics.jpg";

// export default function AuthPage() {
//   const [mode, setMode] = useState("login");

//   return (
//     <div
//       className="min-h-screen flex items-center justify-center bg-cover bg-center px-6"
//       style={{ backgroundImage: `url(${bgImage})` }}
//     >
//       {/* MAIN CARD */}
//       <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden">

//         {/* LEFT – FORMS */}
//         <div className="px-8 py-10 flex flex-col justify-center">
          
//           {/* HEADER */}
//           <div className="mb-8">
//             <h1 className="text-3xl font-bold text-gray-900">
//               Welcome to <span className="text-black">Zelora</span>
//             </h1>
//             <p className="mt-2 text-gray-600 text-sm">
//               Visualize, analyze and manage your databases effortlessly.
//             </p>
//           </div>

//           {/* FORMS */}
//           {mode === "login" && <LoginForm setMode={setMode} />}
//           {mode === "signup" && <SignupForm setMode={setMode} />}
//           {mode === "forgot" && <ForgotPassword setMode={setMode} />}
//         </div>

//         {/* RIGHT – IMAGE */}
//         <div className="hidden md:flex items-center justify-center bg-gray-900">
//           <img
//             src={analyticsImage}
//             alt="Analytics Illustration"
//             className="w-[85%] object-contain"
//           />
//         </div>

//       </div>
//     </div>
//   );
// }

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
