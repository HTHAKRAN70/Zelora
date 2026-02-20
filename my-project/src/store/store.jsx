import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice.js";
import dbReducer from "./dbSlice.js";

const store = configureStore({
  reducer: {
    auth: authReducer,
    db: dbReducer,
  },
});

export default store;
