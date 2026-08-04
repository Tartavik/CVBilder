import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CvsModule } from './cvs/cvs.module';
import { SkillsModule } from './skills/skills.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, UsersModule, SkillsModule, CvsModule],
})
export class BackendModule {}
