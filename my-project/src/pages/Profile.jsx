import { useSelector } from "react-redux";
import { selectUser } from "../store/authSlice.js";

export default function Profile() {
  const user = useSelector(selectUser);
  console.log("User in Profile:", user);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">My Profile</h1>
      <p className="text-slate-600 mb-6">View and manage your account details.</p>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-slate-500">Name</dt>
            <dd className="mt-1 text-slate-900">{user?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Email</dt>
            <dd className="mt-1 text-slate-900">{user?.email ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
