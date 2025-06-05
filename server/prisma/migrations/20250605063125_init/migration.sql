-- CreateTable
CREATE TABLE "Host" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "uptime" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "ssh" BOOLEAN NOT NULL,
    "cpu" DOUBLE PRECISION NOT NULL,
    "ram" DOUBLE PRECISION NOT NULL,
    "disk" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VM" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "cpu" DOUBLE PRECISION NOT NULL,
    "ram" DOUBLE PRECISION NOT NULL,
    "disk" DOUBLE PRECISION NOT NULL,
    "os" TEXT NOT NULL,
    "uptime" INTEGER NOT NULL,
    "xml" TEXT NOT NULL,
    "networkIp" TEXT,
    "networkMac" TEXT,
    "hostId" INTEGER NOT NULL,

    CONSTRAINT "VM_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Host_name_key" ON "Host"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VM_name_hostId_key" ON "VM"("name", "hostId");

-- AddForeignKey
ALTER TABLE "VM" ADD CONSTRAINT "VM_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
