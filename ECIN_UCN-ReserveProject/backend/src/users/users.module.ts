import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserPenalty } from './entities/user-penalty.entity';
import { UserWarning } from './entities/user-warning.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPenalty, UserWarning])], 
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule], 
})
export class UsersModule {}