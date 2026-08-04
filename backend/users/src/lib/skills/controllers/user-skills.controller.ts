import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SkillNameDto } from '../dto/skill-name.dto';
import { UserSkillsService } from '../services/user-skills.service';

@Controller('users/me/skills')
@UseGuards(JwtAuthGuard)
export class UserSkillsController {
  constructor(private readonly userSkillsService: UserSkillsService) {}

  @Get()
  findAll(@CurrentUser('sub') userId: string) {
    return this.userSkillsService.findAll(userId);
  }

  @Delete()
  hide(@CurrentUser('sub') userId: string, @Body() dto: SkillNameDto) {
    return this.userSkillsService.hide(userId, dto.skillName);
  }

  @Post('icon/generate')
  generateIcon(@CurrentUser('sub') userId: string, @Body() dto: SkillNameDto) {
    return this.userSkillsService.generateIcon(userId, dto.skillName);
  }
}
