-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "builderName" TEXT NOT NULL,
    "microMarket" TEXT NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "pricePerSqft" DOUBLE PRECISION NOT NULL,
    "availableUnits" INTEGER NOT NULL,
    "possessionDate" TIMESTAMP(3) NOT NULL,
    "reraNumber" TEXT NOT NULL,
    "amenities" TEXT[],
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "constructionStatus" TEXT NOT NULL,
    "unitTypes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Builder" (
    "id" TEXT NOT NULL,
    "builderName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "deliveryScore" DOUBLE PRECISION NOT NULL,
    "reraScore" DOUBLE PRECISION NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "financialScore" DOUBLE PRECISION NOT NULL,
    "responsivenessScore" DOUBLE PRECISION NOT NULL,
    "totalTrustScore" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "partnerStatus" BOOLEAN NOT NULL DEFAULT false,
    "commissionRatePct" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Builder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "pricePerSqft" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yoyGrowthPct" DOUBLE PRECISION NOT NULL,
    "demandScore" DOUBLE PRECISION NOT NULL,
    "avgPricePerSqft" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Infrastructure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priceImpactPct" DOUBLE PRECISION NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Infrastructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "qualityRating" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerDemand" (
    "id" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "inquiryCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerDemand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "visitToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "visitScheduledDate" TIMESTAMP(3) NOT NULL,
    "visitCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "commissionAmt" DOUBLE PRECISION NOT NULL,
    "attributionToken" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_reraNumber_key" ON "Project"("reraNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Builder_builderName_key" ON "Builder"("builderName");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Locality_name_key" ON "Locality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisit_visitToken_key" ON "SiteVisit"("visitToken");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_builderName_fkey" FOREIGN KEY ("builderName") REFERENCES "Builder"("builderName") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
