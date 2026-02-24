import { IsNotEmpty, IsString } from 'class-validator';

export class SpaceIdDto {
  @IsString()
  @IsNotEmpty()
  //@IsUUID()
  spaceId: string;
}
