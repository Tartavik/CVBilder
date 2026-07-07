import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { LoginDto } from './dto/login.dto';
import { SaveCvDto } from './dto/save-cv.dto';
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
    return this.usersService.create(dto.email, dto.password);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.usersService.login(dto.email, dto.password);
    if (!user) throw new ConflictException('Invalid email or password');
    return user;
  }

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

  @Get(':id/skills')
  getSkills(@Param('id') id: string) {
    return this.usersService.getUserSkills(id);
  }

  @Get(':id/cvs')
  getCvs(@Param('id') id: string) {
    return this.usersService.getUserCvs(id);
  }

  @Post(':id/cvs')
  createCv(@Param('id') id: string) {
    return this.usersService.createCv(id);
  }

  @Get(':id/cvs/:cvId')
  getCv(@Param('id') id: string, @Param('cvId') cvId: string) {
    return this.usersService.getUserCv(id, cvId);
  }

  @Patch(':id/profile')
  updateProfile(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(id, dto);
  }

  @Patch(':id/settings')
  updateSettings(@Param('id') id: string, @Body() dto: UpdateSettingsDto) {
    return this.usersService.updateSettings(id, dto);
  }

  @Put(':id/cvs/:cvId')
  saveCv(
    @Param('id') id: string,
    @Param('cvId') cvId: string,
    @Body() dto: SaveCvDto,
  ) {
    return this.usersService.saveCv(id, cvId, dto);
  }

  @Post(':id/cvs/:cvId/skills/icon/generate')
  generateSkillIcon(
    @Param('id') id: string,
    @Param('cvId') cvId: string,
    @Body() body: { skillName?: string },
  ) {
    return this.usersService.generateSkillIcon(id, cvId, body?.skillName);
  }

  @Post(':id/cvs/:cvId/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadCvPhoto(
    @Param('id') id: string,
    @Param('cvId') cvId: string,
    @UploadedFile()
    file?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    return this.usersService.uploadCvPhoto(id, cvId, file);
  }

  @Delete(':id/cvs/:cvId/photo')
  deleteCvPhoto(@Param('id') id: string, @Param('cvId') cvId: string) {
    return this.usersService.deleteCvPhoto(id, cvId);
  }
}
