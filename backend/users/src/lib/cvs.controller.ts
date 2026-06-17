import { Controller, Get, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('cvs')
export class CvsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('skills') skills?: string) {
    return this.usersService.getAllCvs(skills);
  }

  @Get(':cvId')
  getPublicCv(@Param('cvId') cvId: string) {
    return this.usersService.getPublicCv(cvId);
  }
}
