import { createSlice } from "@reduxjs/toolkit";

const AUTH_TOKEN_KEY = "zelora_token";
const AUTH_USER_KEY = "zelora_user";

function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearStoredAuth() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {}
}

const initialState = {
  token: getStoredToken(),
  user: getStoredUser(),
  isAuthenticated: !!getStoredToken(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { token, user } = action.payload;
      console.log("Setting credentials:", { token, user });
      state.token = token;
      state.user = user ?? state.user;
      state.isAuthenticated = !!token;
      if (token) {
        try {
          localStorage.setItem(AUTH_TOKEN_KEY, token);
          if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        } catch {}
      } else {
        clearStoredAuth();  
      }
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      clearStoredAuth();
    },
    hydrateFromStorage(state) {
      const token = getStoredToken();
      const user = getStoredUser();
      state.token = token;
      state.user = user;
      state.isAuthenticated = !!token;
    },
  },
});

export const { setCredentials, logout, hydrateFromStorage } = authSlice.actions;
export default authSlice.reducer;

export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export { AUTH_TOKEN_KEY, AUTH_USER_KEY };
