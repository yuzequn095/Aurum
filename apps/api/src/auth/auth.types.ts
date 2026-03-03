export type JwtPayload = {
  userId: string;
  email: string;
};

export type AuthenticatedUser = JwtPayload;
