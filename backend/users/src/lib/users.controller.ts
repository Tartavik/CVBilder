import { Body, ConflictException, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');
    // Тимчасово зберігаємо пароль як є — замінимо на bcrypt коли буде Auth
    return this.usersService.create(dto.email, dto.password);
  }

  // Тимчасово приймаємо userId як param — замінимо на JWT guard коли буде Auth
  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get(':id/profile')
  getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Get(':id/settings')
  getSettings(@Param('id') id: string) {
    return this.usersService.getSettings(id);
  }

  @Patch(':id/profile')
  updateProfile(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(id, dto);
  }

  @Patch(':id/settings')
  updateSettings(@Param('id') id: string, @Body() dto: UpdateSettingsDto) {
    return this.usersService.updateSettings(id, dto);
  }
}
