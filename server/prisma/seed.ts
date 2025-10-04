import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 샘플 사용자 생성
  const user = await prisma.user.upsert({
    where: { email: 'admin@boardgame.com' },
    update: {},
    create: {
      email: 'admin@boardgame.com',
      username: 'admin',
      password: '$2b$10$dummy.hash.for.seed.user.password',
      name: '관리자',
    },
  });

  // 샘플 게임 생성
  const game = await prisma.game.upsert({
    where: { id: 'sample-game-1' },
    update: {},
    create: {
      id: 'sample-game-1',
      name: '카탄',
      description: '자원을 수집하고 정착지를 건설하는 전략 게임',
      minPlayers: 3,
      maxPlayers: 4,
      playTime: 75,
      complexity: 3,
      createdById: user.id,
      rules: {
        create: [
          {
            title: '게임 목표',
            content: '가장 먼저 10점을 획득하는 플레이어가 승리합니다.',
            order: 1,
          },
          {
            title: '초기 설정',
            content: '각 플레이어는 정착지 2개와 도로 2개를 초기 배치합니다.',
            order: 2,
          },
        ],
      },
    },
  });

  console.log({ user, game });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
