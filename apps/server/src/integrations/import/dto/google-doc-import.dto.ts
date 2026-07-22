import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleDocImportDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  spaceId: string;
}
