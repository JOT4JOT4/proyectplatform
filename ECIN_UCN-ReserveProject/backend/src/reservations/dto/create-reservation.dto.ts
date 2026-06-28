import { IsString, IsDateString, Matches, IsUUID, IsOptional } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  spaceId: string;

  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  date: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime debe tener formato HH:mm (ej: 08:30)' })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime debe tener formato HH:mm (ej: 10:00)' })
  endTime: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}