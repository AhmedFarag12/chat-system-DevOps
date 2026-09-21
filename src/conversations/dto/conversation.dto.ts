import { ArrayMinSize, IsArray, IsMongoId, IsString } from 'class-validator';

export class CreateDirectDto {
  @IsMongoId()
  userId: string;
}

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  userIds: string[];
}
