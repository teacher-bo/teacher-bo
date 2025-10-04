import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: string) {
    return this.prisma.gameSession.create({
      data: {
        ...data,
        hostId: userId,
      },
      include: {
        game: true,
        host: true,
        players: true,
      },
    });
  }

  async findAll() {
    return this.prisma.gameSession.findMany({
      include: {
        game: true,
        host: true,
        players: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.gameSession.findUnique({
      where: { id },
      include: {
        game: true,
        host: true,
        players: true,
        scores: {
          include: {
            player: true,
          },
        },
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.gameSession.update({
      where: { id },
      data,
      include: {
        game: true,
        host: true,
        players: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.gameSession.delete({
      where: { id },
    });
  }
}
