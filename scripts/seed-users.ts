import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { UserSchema } from '../src/users/user.schema';

const users = ['ahmed', 'sara', 'omar', 'mona', 'youssef'].map((name) => ({
  username: name,
  email: `${name}@example.com`,
}));

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const User = mongoose.model('User', UserSchema);
  const password = await bcrypt.hash('123456', 10);

  for (const u of users) {
    await User.updateOne({ email: u.email }, { $setOnInsert: { ...u, password } }, { upsert: true });
  }
  console.log('users in db:', await User.countDocuments());
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
