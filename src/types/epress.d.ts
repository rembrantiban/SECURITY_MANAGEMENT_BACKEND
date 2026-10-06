

declare namespace Express {
  export interface Request {
    user?: {
      user_id: number;
      role: string;
      /** JWT expiry claim (seconds since epoch). */
      exp?: number;
    };
  }
}