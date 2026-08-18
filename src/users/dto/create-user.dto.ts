export type CreateUserDto = {
  email: string;
  username: string;
  password?: string;
  firstName: string;
  lastName: string;
  authProvider?: 'local' | 'google';
  avatar?: string;
  googleId?: string;
  isEmailVerified?: boolean;
  /** Defaults to `false`: newly created accounts are pending approval until an admin activates them. */
  isActive?: boolean;
};
