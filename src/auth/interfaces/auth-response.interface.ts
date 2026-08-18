import { UserRole, AccountTier } from '../../users/schemas/user.schema';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    avatar?: string;
    accountTier: AccountTier;
  };
}

/**
 * Result of a self-service registration. Accounts are created inactive
 * (pending admin approval) so no session/tokens are issued and the client
 * cannot enter the platform until an admin activates the user.
 */
export interface RegisterResponse {
  user: AuthResponse['user'];
  pending: boolean;
}
