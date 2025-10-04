import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: string) {
    return this.prisma.game.create({
      data: {
        ...data,
        createdById: userId,
      },
      include: {
        createdBy: true,
        rules: true,
      },
    });
  }

  async findAll() {
    return this.prisma.game.findMany({
      include: {
        createdBy: true,
        rules: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.game.findUnique({
      where: { id },
      include: {
        createdBy: true,
        rules: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.game.update({
      where: { id },
      data,
      include: {
        createdBy: true,
        rules: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.game.delete({
      where: { id },
    });
  }

  // Game Rules
  async createRule(gameId: string, data: any) {
    return this.prisma.gameRule.create({
      data: {
        ...data,
        gameId,
      },
    });
  }

  async updateRule(id: string, data: any) {
    return this.prisma.gameRule.update({
      where: { id },
      data,
    });
  }

  async removeRule(id: string) {
    return this.prisma.gameRule.delete({
      where: { id },
    });
  }
}
