
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
}

interface User {
  id: string;
  username: string;
  role: 'admin' | 'school';
  [key: string]: any; // Allow additional properties from API
}

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      console.log('setUser action called with:', action.payload);
      state.user = action.payload;
      state.isAuthenticated = true;
      console.log('State updated:', state);
    },
    logout: () => {
      console.log('logout action called');
      return initialState;
    },
  },
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;