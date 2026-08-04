import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { UsersService } from '../services/users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  getMe(@CurrentUser('sub') userId: string) {
    return this.usersService.findById(userId);
  }

  @Get('me/profile')
  getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me/profile')
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('me/settings')
  getSettings(@CurrentUser('sub') userId: string) {
    return this.usersService.getSettings(userId);
  }

  @Patch('me/settings')
  updateSettings(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(userId, dto);
  }
}
