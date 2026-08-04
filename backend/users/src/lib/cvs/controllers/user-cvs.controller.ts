import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SkillNameDto } from '../../skills/dto/skill-name.dto';
import { SaveCvDto } from '../dto/save-cv.dto';
import { SetCvPublicationDto } from '../dto/set-cv-publication.dto';
import { CvPhotoService, UploadedPhoto } from '../services/cv-photo.service';
import { CvService } from '../services/cv.service';

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UserCvsController {
  constructor(
    private readonly cvService: CvService,
    private readonly cvPhotoService: CvPhotoService,
  ) {}

  @Get('cvs')
  findAll(@CurrentUser('sub') userId: string) {
    return this.cvService.findUserCvs(userId);
  }

  @Get('cv-library')
  getLibrary(@CurrentUser('sub') userId: string) {
    return this.cvService.getLibrary(userId);
  }

  @Get('cvs/:cvId/library')
  getCvLibrary(
    @CurrentUser('sub') userId: string,
    @Param('cvId') cvId: string,
  ) {
    return this.cvService.getLibrary(userId, cvId);
  }

  @Post('cvs/:cvId')
  createFromDraft(
    @CurrentUser('sub') userId: string,
    @Param('cvId', new ParseUUIDPipe()) cvId: string,
    @Body() dto: SaveCvDto,
  ) {
    return this.cvService.createFromDraft(userId, cvId, dto);
  }

  @Get('cvs/:cvId')
  findOne(@CurrentUser('sub') userId: string, @Param('cvId') cvId: string) {
    return this.cvService.findUserCv(userId, cvId);
  }

  @Put('cvs/:cvId')
  save(
    @CurrentUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Body() dto: SaveCvDto,
  ) {
    return this.cvService.save(userId, cvId, dto);
  }

  @Patch('cvs/:cvId/publication')
  setPublication(
    @CurrentUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Body() dto: SetCvPublicationDto,
  ) {
    return this.cvService.setPublication(userId, cvId, dto.isPublished);
  }

  @Delete('cvs/:cvId')
  delete(@CurrentUser('sub') userId: string, @Param('cvId') cvId: string) {
    return this.cvService.delete(userId, cvId);
  }

  @Post('cvs/:cvId/skills/icon/generate')
  generateSkillIcon(
    @CurrentUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @Body() dto: SkillNameDto,
  ) {
    return this.cvService.generateSkillIcon(userId, cvId, dto.skillName);
  }

  @Post('cvs/:cvId/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPhoto(
    @CurrentUser('sub') userId: string,
    @Param('cvId') cvId: string,
    @UploadedFile() file?: UploadedPhoto,
  ) {
    return this.cvPhotoService.upload(userId, cvId, file);
  }

  @Delete('cvs/:cvId/photo')
  deletePhoto(@CurrentUser('sub') userId: string, @Param('cvId') cvId: string) {
    return this.cvPhotoService.delete(userId, cvId);
  }
}
