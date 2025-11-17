/*
  Warnings:

  - You are about to drop the `game_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `game_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `games` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `player_scores` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_players` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `game_rules` DROP FOREIGN KEY `game_rules_gameId_fkey`;

-- DropForeignKey
ALTER TABLE `game_sessions` DROP FOREIGN KEY `game_sessions_gameId_fkey`;

-- DropForeignKey
ALTER TABLE `game_sessions` DROP FOREIGN KEY `game_sessions_hostId_fkey`;

-- DropForeignKey
ALTER TABLE `games` DROP FOREIGN KEY `games_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `player_scores` DROP FOREIGN KEY `player_scores_playerId_fkey`;

-- DropForeignKey
ALTER TABLE `player_scores` DROP FOREIGN KEY `player_scores_sessionId_fkey`;

-- DropForeignKey
ALTER TABLE `session_players` DROP FOREIGN KEY `session_players_sessionId_fkey`;

-- DropTable
DROP TABLE `game_rules`;

-- DropTable
DROP TABLE `game_sessions`;

-- DropTable
DROP TABLE `games`;

-- DropTable
DROP TABLE `player_scores`;

-- DropTable
DROP TABLE `session_players`;

-- DropTable
DROP TABLE `users`;
