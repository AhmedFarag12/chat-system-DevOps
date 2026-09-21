import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  create(data: Pick<User, 'username' | 'email' | 'password'>) {
    return this.users.create(data);
  }

  findById(id: string) {
    return this.users.findById(id);
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.users.findOne({ email: email.toLowerCase() }).select('+password');
  }

  search(term: string, excludeId: string) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.users
      .find({ username: new RegExp(escaped, 'i'), _id: { $ne: excludeId } })
      .limit(20);
  }
}
