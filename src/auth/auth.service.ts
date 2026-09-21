import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserDocument } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const password = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.users.create({ ...dto, password });
      return this.issue(user);
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException('Username or email already in use');
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issue(user);
  }

  private async issue(user: UserDocument) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
    });
    const { password: _omit, ...safe } = user.toObject();
    return { accessToken, user: safe };
  }
}
