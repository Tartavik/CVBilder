import { Controller, Get, Param, Query } from '@nestjs/common';
import { CvQueryService } from './cv-query.service';
import { CvListQueryParams, parseCvListQuery } from './dto/list-cvs-query.dto';
import { UsersService } from './users.service';

@Controller('cvs')
export class CvsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cvQueryService: CvQueryService,
  ) {}

  @Get()
  findAll(@Query() query: CvListQueryParams) {
    return this.cvQueryService.findAll(parseCvListQuery(query));
  }

  @Get('filters')
  getFilterOptions() {
    return this.cvQueryService.getFilterOptions();
  }

  @Get(':cvId')
  getPublicCv(@Param('cvId') cvId: string) {
    return this.usersService.getPublicCv(cvId);
  }
}
