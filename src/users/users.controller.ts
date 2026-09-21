import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Req() req: AuthedRequest) {
    return this.users.findById(req.user.sub);
  }

  @Get()
  search(@Query('q') q = '', @Req() req: AuthedRequest) {
    return this.users.search(q, req.user.sub);
  }
}
