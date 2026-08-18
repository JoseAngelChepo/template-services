import { IsEnum, IsMongoId } from 'class-validator';
import { ClientMemberRole } from '../schemas/client-member.schema';

export class AddClientMemberDto {
  @IsMongoId()
  userId: string;

  @IsEnum(ClientMemberRole)
  role: ClientMemberRole;
}
