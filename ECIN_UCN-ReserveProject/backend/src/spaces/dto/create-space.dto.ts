import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SpaceType } from '../entities/space.entity';

export class CreateSpaceDto {
	@IsString()
	name: string;

	@IsString()
	zone: string;

	@IsEnum(SpaceType)
	type: SpaceType;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsString()
	imageUrl?: string;

	@IsOptional()
	@IsInt()
	@Min(1)
	capacity?: number;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;

	@IsOptional()
	@IsString()
	parentId?: string;
}
