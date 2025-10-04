import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  username: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
