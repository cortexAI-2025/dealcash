import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth.slice';
import listingsReducer from './listings.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    listings: listingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
