// import { configureStore } from '@reduxjs/toolkit';
// import userReducer from './slices/userSlice';


// export const store = configureStore({
//   reducer: {
//     user: userReducer,
//   },
// });

// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage
import { combineReducers } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';

// ✨ PERSIST CONFIG - WHITELIST APPROACH
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user'], // 🎯 ONLY PERSIST USER STATE
  // blacklist: ['someOtherSlice'], // 🚫 Use if you want to exclude specific slices
};

const rootReducer = combineReducers({
  user: userReducer,
  // Add other reducers here as your app grows
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // 🔧 IGNORE REDUX-PERSIST ACTIONS
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/REGISTER',
          'persist/PURGE',
        ],
      },
    }),
  // 🚀 Enable Redux DevTools in developmen
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;