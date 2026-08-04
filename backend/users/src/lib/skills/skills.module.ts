import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SKILL_ENTITIES } from '../database/database.entities';
import { AiIconService } from '../infrastructure/ai/ai-icon.service';
import { UsersModule } from '../users/users.module';
import { UserSkillsController } from './controllers/user-skills.controller';
import { UserSkillsService } from './services/user-skills.service';

@Module({
  imports: [AuthModule, UsersModule, TypeOrmModule.forFeature(SKILL_ENTITIES)],
  controllers: [UserSkillsController],
  providers: [UserSkillsService, AiIconService],
  exports: [UserSkillsService],
})
export class SkillsModule {}
