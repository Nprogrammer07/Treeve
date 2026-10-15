import type { RequestHandler } from 'express';
import type { Credenciales } from '../../../application/CasosDeUsoUsuario';
import { UnauthenticatedError } from '../../../domain/errors';

export interface TokenVerifier {
  verify(token: string): Promise<{ userId: string } | null>;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: Credenciales;
  }
}

export function authenticate(verifier: TokenVerifier): RequestHandler {
  return (req, _res, next) => {
    const [scheme, token] = (req.header('authorization') ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      next(new UnauthenticatedError());
      return;
    }
    verifier
      .verify(token)
      .then((resultado) => {
        if (!resultado) {
          next(new UnauthenticatedError());
          return;
        }
        req.auth = { userId: resultado.userId, accessToken: token };
        next();
      })
      .catch(next);
  };
}
