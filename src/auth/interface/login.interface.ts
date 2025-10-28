export interface ResponseUser {
  userId: string;
  name: string;
  email: string;
}

export interface UserEntity extends ResponseUser {
  password: string;
}

export interface PayloadRFToken extends ResponseUser {
  iat: number;
  exp: number;
}
