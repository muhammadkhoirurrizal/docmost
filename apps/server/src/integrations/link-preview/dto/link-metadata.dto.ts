import { IsUrl, IsNotEmpty } from 'class-validator';

export class LinkMetadataDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;
}

export interface LinkMetadataResponse {
  url: string;
  title: string | null;
  icon: string | null;
  provider: string;
}
