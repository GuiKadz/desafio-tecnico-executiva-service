import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserPayload } from '../../../common/types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Nota: `config` é usado diretamente (sem `private readonly`) porque o
  // valor precisa estar disponível ANTES da chamada a super() — atribuir
  // a `this.config` só é possível depois do super(), mas o parâmetro em
  // si já está acessível nesse ponto.
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  // O retorno aqui é anexado em request.user pelo Passport.
  validate(payload: CurrentUserPayload): CurrentUserPayload {
    return payload;
  }
}
