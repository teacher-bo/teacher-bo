import { Resolver } from '@nestjs/graphql';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@Resolver()
export class TranscribeResolver {
  private readonly logger = new Logger(TranscribeResolver.name);

  constructor() {}
}
