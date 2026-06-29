

declare namespace Express {
  export interface Request {
    user?: {
      user_id: number;
      role: string;
    };
  }
}