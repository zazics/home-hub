import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

// Request body DTO for PATCH /devices/:id/light-command - see ADR 0003, section 3.1.
// Both fields optional at the DTO level; the "at least one present" rule is
// enforced in SendLightCommandUseCase (kept out of the DTO to stay a simple,
// synchronous class-validator shape, consistent with ListDevicesQueryDto).
export class LightCommandDto {
  @IsOptional()
  @IsIn(['on', 'off'])
  power?: 'on' | 'off';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  brightness?: number;
}
