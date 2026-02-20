import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Auth from "./pages/Auth.jsx";
import RootLayout from "./pages/RootLayout.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";

import HomePage from "./pages/HomePage.jsx";
import Contact from "./pages/Contact.jsx";
import Support from "./pages/Support.jsx";
import Profile from "./pages/Profile.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import Databases from "./pages/Databases.jsx";
import Tables from "./pages/Tables.jsx";
import Graph from "./pages/Graph.jsx";
import Settings from "./pages/Settings.jsx";
import NotFound from "./pages/NotFound.jsx";

const router = createBrowserRouter([
  { path: "/", element: <Auth /> },
  {
    path: "/home",
    element: (
      <PrivateRoute>
        <RootLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: "contact", element: <Contact /> },
      { path: "support", element: <Support /> },
      { path: "profile", element: <Profile /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "databases", element: <Databases /> },
      { path: "tables", element: <Tables /> },
      { path: "graph", element: <Graph /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <Provider store={store}>
      <ToastContainer />
      <RouterProvider router={router} />
    </Provider>
  );
}
