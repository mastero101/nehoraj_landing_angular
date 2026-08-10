export interface User {
  id: string;
  username: string;
  role: string;
  avatar_url?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
