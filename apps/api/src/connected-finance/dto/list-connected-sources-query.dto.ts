import { connectedSourceKinds, connectedSourceStatuses } from '@aurum/core';
import { IsIn, IsOptional } from 'class-validator';

export class ListConnectedSourcesQueryDto {
  @IsOptional()
  @IsIn(connectedSourceKinds)
  kind?: (typeof connectedSourceKinds)[number];

  @IsOptional()
  @IsIn(connectedSourceStatuses)
  status?: (typeof connectedSourceStatuses)[number];
}
