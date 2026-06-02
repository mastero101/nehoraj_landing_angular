export interface User {
  id: string;
  username: string;
  role: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
