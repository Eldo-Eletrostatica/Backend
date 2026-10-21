import { PartialType } from '@nestjs/swagger';
import { CreateCompanyEventDto } from './create-company-event.dto';

export class UpdateCompanyEventDto extends PartialType(CreateCompanyEventDto) {}
