
// import React, { useState } from "react";
// import {
//   SiPostgresql,
//   SiMysql,
//   SiMongodb,
//   // SiMicrosoftsqlserver,
//   SiOracle,
// } from "react-icons/si";

// const DB_OPTIONS = [
//   { id: "MongoDB", icon: <SiMongodb />, label: "MongoDB" },
//   { id: "PostgreSQL", icon: <SiPostgresql />, label: "PostgreSQL" },
//   { id: "MySQL", icon: <SiMysql />, label: "MySQL" },
//   // { id: "SQL Server", icon: <SiMicrosoftsqlserver />, label: "SQL Server" },
//   { id: "Oracle", icon: <SiOracle />, label: "Oracle" },
// ];

// export default function Databases() {
//   const [tabOpened, setTabOpened] = useState(false);
//   // Defaulting to MongoDB so fields appear immediately
//   const [dbType, setDbType] = useState("MongoDB");

//   const closeModal = () => {
//     setTabOpened(false);
//     setDbType("MongoDB"); // Reset to default for next open
//   };

//   return (
//     <div className="p-8">
//       <h1 className="text-2xl font-bold text-slate-900 mb-2">Connect Your Database</h1>
//       <p className="text-slate-600">Manage and connect to your databases.</p>

//       <button
//         onClick={() => setTabOpened(true)}
//         className="mt-3 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
//       >
//         Connect Database
//       </button>

//       {tabOpened && (
//         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
//           <div className="bg-gray-900 text-white rounded-xl w-full max-w-md h-[550px] flex flex-col shadow-xl overflow-hidden">
            
//             {/* HEADER */}
//             <div className="px-6 py-4 border-b border-gray-700">
//               <h2 className="text-xl font-semibold text-center mb-4">Connect {dbType}</h2>
              
//               {/* HORIZONTAL SCROLLABLE TABS */}
//               <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
//                 {DB_OPTIONS.map((db) => (
//                   <button
//                     key={db.id}
//                     onClick={() => setDbType(db.id)}
//                     className={`flex flex-col items-center min-w-[80px] p-2 rounded-lg transition-all duration-200 ${
//                       dbType === db.id 
//                         ? "bg-blue-600 text-white ring-2 ring-blue-400" 
//                         : "bg-gray-800 text-gray-400 hover:bg-gray-700"
//                     }`}
//                   >
//                     <span className="text-xl">{db.icon}</span>
//                     <span className="text-xs mt-1 whitespace-nowrap">{db.label}</span>
//                   </button>
//                 ))}
//               </div>
//             </div>

//             {/* BODY (FIXED HEIGHT SCROLLABLE CONTENT) */}
//             <div className="flex-1 overflow-y-auto px-6 py-6">
//               <div className="space-y-4">
//                 {dbType === "MongoDB" ? (
//                   <div className="space-y-4 animate-in fade-in duration-300">
//                     <label className="text-sm font-medium text-gray-400">Connection String</label>
//                     <Input placeholder="mongodb+srv://username:password@cluster.mongodb.net/db" />
//                     <p className="text-xs text-gray-500 italic">Ensure your IP is whitelisted in MongoDB Atlas.</p>
//                   </div>
//                 ) : (
//                   <div className="space-y-4 animate-in fade-in duration-300">
//                     <Input placeholder="Host (e.g., localhost or IP)" />
//                     <div className="grid grid-cols-3 gap-2">
//                       <div className="col-span-1">
//                          <Input placeholder="Port" />
//                       </div>
//                       <div className="col-span-2">
//                          <Input placeholder="Database Name" />
//                       </div>
//                     </div>
//                     <Input placeholder="Username" />
//                     <Input type="password" placeholder="Password" />
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* FOOTER */}
//             <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3 bg-gray-900">
//               <button
//                 onClick={closeModal}
//                 className="px-4 py-2 text-gray-400 hover:text-white transition"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => {
//                    console.log(`Connecting to ${dbType}...`);
//                    closeModal();
//                 }}
//                 className="px-6 py-2 bg-blue-600 rounded-lg font-semibold hover:bg-blue-500 transition-colors"
//               >
//                 Connect
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ------------------ REUSABLE COMPONENTS ------------------ */

// function Input({ placeholder, type = "text" }) {
//   return (
//     <input
//       type={type}
//       placeholder={placeholder}
//       className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
//     />
//   );
// }

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
        const { token, user } = res.data;
        dispatch(setCredentials({ token, user }));
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
