import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice.js";
import dbReducer from "./dbSlice.js";
import graphReducer from "./graphSlice.js";

const store = configureStore({
  reducer: {
    auth: authReducer,
    db: dbReducer,
    graph: graphReducer,
  },
});

export default store;
