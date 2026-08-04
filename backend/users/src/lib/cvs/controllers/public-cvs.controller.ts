import { Controller, Get, Param, Query } from '@nestjs/common';
import { CvListQueryParams, parseCvListQuery } from '../dto/list-cvs-query.dto';
import { CvQueryService } from '../services/cv-query.service';
import { CvService } from '../services/cv.service';

@Controller('cvs')
export class PublicCvsController {
  constructor(
    private readonly cvService: CvService,
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
  findOne(@Param('cvId') cvId: string) {
    return this.cvService.findPublicCv(cvId);
  }
}
