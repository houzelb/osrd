import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ApiError } from 'common/api/baseGeneratedApis';
import type { BuiltinRole } from 'common/api/osrdEditoastApi';

export interface UserState {
  isLogged: boolean;
  loginError?: ApiError;
  username: string;
  userPreferences: { safeWord: string };
  userRoles: BuiltinRole[];
  account: Record<string, string>;
}

export const userInitialState: UserState = {
  isLogged: false,
  loginError: undefined,
  username: '',
  userPreferences: { safeWord: '' },
  userRoles: [],
  account: {},
};

export const userSlice = createSlice({
  name: 'user',
  initialState: userInitialState,
  reducers: {
    loginSuccess(
      state,
      action: PayloadAction<{
        username: UserState['username'];
      }>
    ) {
      const { username } = action.payload;
      state.username = username;
      state.isLogged = true;
    },
    loginError(state, action: PayloadAction<ApiError | undefined>) {
      state.isLogged = false;
      state.loginError = action.payload;
    },
    logoutSuccess() {
      return userInitialState;
    },
    setUserRoles(state, action: PayloadAction<BuiltinRole[] | undefined>) {
      state.userRoles = action.payload || [];
    },
    updateUserPreferences(state, action: PayloadAction<{ safeWord: string }>) {
      state.userPreferences = action.payload;
    },
  },
});

export const { loginSuccess, loginError, logoutSuccess, setUserRoles, updateUserPreferences } =
  userSlice.actions;

export default userSlice.reducer;
