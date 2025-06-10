-- CreateTable
CREATE TABLE "PollHistory" (
    "id" SERIAL NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "up" INTEGER NOT NULL,
    "down" INTEGER NOT NULL,

    CONSTRAINT "PollHistory_pkey" PRIMARY KEY ("id")
);
