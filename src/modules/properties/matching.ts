import { Prisma, PrismaClient, PropertyStatus } from "@prisma/client";

import type { LeadExtractedPreferences } from "@/modules/leads/commercial-signals";

type MatchableProperty = {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  propertyType: string | null;
  status: PropertyStatus;
  publicVisible: boolean;
  priceCents: number | null;
  currency: string | null;
  bedrooms: number | null;
};

export type LeadPropertyShortlistItem = {
  propertyId: string;
  title: string;
  city: string | null;
  neighborhood: string | null;
  propertyType: string | null;
  priceCents: number | null;
  currency: string | null;
  bedrooms: number | null;
  score: number;
  reasons: string[];
};

export type LeadPropertyMatchTrace = {
  status:
    | "matched"
    | "existing-link"
    | "manual-confirmed"
    | "manual-overridden"
    | "no-match";
  propertyId: string | null;
  propertyTitle: string | null;
  score: number | null;
  reasons: string[];
  consideredSignals: string[];
  shortlist: LeadPropertyShortlistItem[];
};

export type LeadPropertyMatchResult = {
  property: MatchableProperty | null;
  trace: LeadPropertyMatchTrace;
};

type MatchLeadToPropertyParams = {
  organizationId: string;
  currentPropertyId: string | null;
  latestMessageBody: string;
  extractedPreferences: LeadExtractedPreferences;
};

const PROPERTY_TYPE_KEYWORDS: Array<{ label: string; aliases: string[] }> = [
  { label: "departamento", aliases: ["departamento", "depto", "depa"] },
  { label: "casa", aliases: ["casa", "casaquinta"] },
  { label: "ph", aliases: ["ph"] },
  { label: "terreno", aliases: ["terreno", "lote"] },
  { label: "oficina", aliases: ["oficina"] },
  { label: "local", aliases: ["local"] },
  { label: "cochera", aliases: ["cochera", "garage"] },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function detectRequestedPropertyType(input: string) {
  const normalized = normalizeText(input);

  for (const option of PROPERTY_TYPE_KEYWORDS) {
    if (option.aliases.some((alias) => normalized.includes(alias))) {
      return option.label;
    }
  }

  return null;
}

function normalizePropertyType(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  for (const option of PROPERTY_TYPE_KEYWORDS) {
    if (option.aliases.some((alias) => normalized.includes(alias))) {
      return option.label;
    }
  }

  return normalized;
}

function extractRooms(input: string) {
  const match = input.match(/(\d+)\s*(ambientes|ambiente|dormitorios|dormitorio|cuartos|cuarto)/i);
  return match ? Number(match[1]) : null;
}

function parseBudgetUnits(rawValue: string | null | undefined) {
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.toLowerCase();
  const candidates = [...normalized.matchAll(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*)(k|m|mil|millon(?:es)?)?/gi)];

  if (!candidates.length) {
    return null;
  }

  const values = candidates
    .map((match) => {
      const rawNumber = match[1] ?? "";
      const suffix = match[2]?.toLowerCase() ?? "";
      const hasCommaAndDot = rawNumber.includes(",") && rawNumber.includes(".");
      let normalizedNumber = rawNumber;

      if (hasCommaAndDot) {
        normalizedNumber = rawNumber.replace(/\./g, "").replace(",", ".");
      } else if (rawNumber.includes(".") && !rawNumber.includes(",")) {
        normalizedNumber = rawNumber.replace(/\./g, "");
      } else if (rawNumber.includes(",") && !rawNumber.includes(".")) {
        normalizedNumber = rawNumber.replace(/\./g, "").replace(",", ".");
      }

      const numeric = Number(normalizedNumber);

      if (!Number.isFinite(numeric)) {
        return null;
      }

      if (suffix === "k" || suffix === "mil") {
        return numeric * 1_000;
      }

      if (suffix === "m" || suffix.startsWith("millon")) {
        return numeric * 1_000_000;
      }

      if (
        numeric < 1_000 &&
        /\b(millon|millones)\b/.test(normalized)
      ) {
        return numeric * 1_000_000;
      }

      return numeric;
    })
    .filter((value): value is number => value !== null);

  if (!values.length) {
    return null;
  }

  return Math.max(...values);
}

function buildConsideredSignals(
  latestMessageBody: string,
  extractedPreferences: LeadExtractedPreferences,
) {
  const detectedPropertyType = detectRequestedPropertyType(latestMessageBody);
  const detectedRooms = extractedPreferences.rooms ?? extractRooms(latestMessageBody);
  const detectedBudget =
    parseBudgetUnits(extractedPreferences.budget) ?? parseBudgetUnits(latestMessageBody);
  const detectedZones = uniqueStrings(
    extractedPreferences.zones.map((zone) => normalizeText(zone)).filter(Boolean),
  );

  const consideredSignals: string[] = [];

  if (detectedZones.length) {
    consideredSignals.push("zone");
  }

  if (detectedBudget) {
    consideredSignals.push("budget");
  }

  if (detectedRooms) {
    consideredSignals.push("rooms");
  }

  if (detectedPropertyType) {
    consideredSignals.push("property type");
  }

  return {
    normalizedMessage: normalizeText(latestMessageBody),
    detectedPropertyType,
    detectedRooms,
    detectedBudget,
    detectedZones,
    consideredSignals,
  };
}

function mapProperty(property: MatchableProperty) {
  return {
    id: property.id,
    title: property.title,
    address: property.address,
    city: property.city,
    neighborhood: property.neighborhood,
    propertyType: property.propertyType,
    status: property.status,
    publicVisible: property.publicVisible,
    priceCents: property.priceCents,
    currency: property.currency,
    bedrooms: property.bedrooms,
  };
}

function mapShortlistItem(
  property: MatchableProperty,
  score: number,
  reasons: string[],
): LeadPropertyShortlistItem {
  return {
    propertyId: property.id,
    title: property.title,
    city: property.city,
    neighborhood: property.neighborhood,
    propertyType: property.propertyType,
    priceCents: property.priceCents,
    currency: property.currency,
    bedrooms: property.bedrooms,
    score,
    reasons,
  };
}

export async function matchLeadToProperty(
  prisma: Prisma.TransactionClient | PrismaClient,
  params: MatchLeadToPropertyParams,
): Promise<LeadPropertyMatchResult> {
  if (params.currentPropertyId) {
    const linkedProperty = await prisma.property.findFirst({
      where: {
        id: params.currentPropertyId,
        organizationId: params.organizationId,
        status: PropertyStatus.AVAILABLE,
      },
      select: {
        id: true,
        title: true,
        address: true,
        city: true,
        neighborhood: true,
        propertyType: true,
        status: true,
        publicVisible: true,
        priceCents: true,
        currency: true,
        bedrooms: true,
      },
    });

    if (linkedProperty) {
      return {
        property: mapProperty(linkedProperty),
        trace: {
          status: "existing-link",
          propertyId: linkedProperty.id,
          propertyTitle: linkedProperty.title,
          score: null,
          consideredSignals: [],
          shortlist: [],
          reasons: [
            `Lead already had ${linkedProperty.title} linked, so the existing property context was preserved.`,
          ],
        },
      };
    }
  }

  const signals = buildConsideredSignals(params.latestMessageBody, params.extractedPreferences);
  const properties = await prisma.property.findMany({
    where: {
      organizationId: params.organizationId,
      status: PropertyStatus.AVAILABLE,
    },
    select: {
      id: true,
      title: true,
      address: true,
      city: true,
      neighborhood: true,
      propertyType: true,
      status: true,
      publicVisible: true,
      priceCents: true,
      currency: true,
      bedrooms: true,
    },
    orderBy: [{ publicVisible: "desc" }, { updatedAt: "desc" }],
    take: 150,
  });

  if (!properties.length) {
    return {
      property: null,
      trace: {
        status: "no-match",
        propertyId: null,
        propertyTitle: null,
        score: null,
        consideredSignals: signals.consideredSignals,
        shortlist: [],
        reasons: ["No available properties were found in the current inventory."],
      },
    };
  }

  if (!signals.consideredSignals.length) {
    return {
      property: null,
      trace: {
        status: "no-match",
        propertyId: null,
        propertyTitle: null,
        score: null,
        consideredSignals: [],
        shortlist: [],
        reasons: [
          "The lead still has too little structured demand context to assign a property safely.",
        ],
      },
    };
  }

  const candidates = properties
    .map((property) => {
      let score = 0;
      let matchedSignals = 0;
      let directTitleHit = false;
      const reasons: string[] = [];
      const normalizedTitle = normalizeText(property.title);
      const normalizedNeighborhood = normalizeText(property.neighborhood);
      const normalizedCity = normalizeText(property.city);
      const normalizedPropertyType = normalizePropertyType(property.propertyType);

      if (
        normalizedTitle &&
        normalizedTitle.length >= 5 &&
        signals.normalizedMessage.includes(normalizedTitle)
      ) {
        score += 7;
        matchedSignals += 1;
        directTitleHit = true;
        reasons.push("The lead mentioned this property title directly.");
      }

      if (
        normalizedNeighborhood &&
        (signals.detectedZones.includes(normalizedNeighborhood) ||
          signals.normalizedMessage.includes(normalizedNeighborhood))
      ) {
        score += 4;
        matchedSignals += 1;
        reasons.push(`Neighborhood match: ${property.neighborhood}.`);
      } else if (
        normalizedCity &&
        (signals.detectedZones.includes(normalizedCity) ||
          signals.normalizedMessage.includes(normalizedCity))
      ) {
        score += 2;
        matchedSignals += 1;
        reasons.push(`City match: ${property.city}.`);
      }

      if (
        signals.detectedPropertyType &&
        normalizedPropertyType &&
        normalizedPropertyType === signals.detectedPropertyType
      ) {
        score += 3;
        matchedSignals += 1;
        reasons.push(`Property type match: ${property.propertyType}.`);
      }

      if (signals.detectedRooms && property.bedrooms) {
        if (property.bedrooms === signals.detectedRooms) {
          score += 2;
          matchedSignals += 1;
          reasons.push(`Bedrooms match: ${property.bedrooms}.`);
        } else if (
          property.bedrooms > signals.detectedRooms &&
          property.bedrooms - signals.detectedRooms === 1
        ) {
          score += 1;
          matchedSignals += 1;
          reasons.push(
            `Bedrooms are close to the requested size (${signals.detectedRooms} requested, ${property.bedrooms} available).`,
          );
        }
      }

      if (signals.detectedBudget && property.priceCents) {
        const propertyUnits = property.priceCents / 100;
        const deltaRatio = Math.abs(propertyUnits - signals.detectedBudget) / signals.detectedBudget;

        if (deltaRatio <= 0.15) {
          score += 3;
          matchedSignals += 1;
          reasons.push("Budget is within a close range.");
        } else if (deltaRatio <= 0.3) {
          score += 2;
          matchedSignals += 1;
          reasons.push("Budget is reasonably aligned.");
        }
      }

      return {
        property,
        score,
        matchedSignals,
        directTitleHit,
        reasons,
      };
    })
    .sort((left, right) => right.score - left.score);

  const bestCandidate = candidates[0];
  const runnerUp = candidates[1];
  const shortlist = candidates
    .filter((candidate) => candidate.score >= Math.max((bestCandidate?.score ?? 0) - 2, 3))
    .slice(0, 3)
    .map((candidate) =>
      mapShortlistItem(candidate.property, candidate.score, candidate.reasons),
    );

  if (!bestCandidate || bestCandidate.score <= 0) {
    return {
      property: null,
      trace: {
        status: "no-match",
        propertyId: null,
        propertyTitle: null,
        score: null,
        consideredSignals: signals.consideredSignals,
        shortlist: [],
        reasons: [
          "The lead signals did not line up clearly enough with the current inventory.",
        ],
      },
    };
  }

  const hasConfidenceThreshold =
    bestCandidate.directTitleHit ||
    (bestCandidate.score >= 6 && bestCandidate.matchedSignals >= 2);
  const hasClearLead = !runnerUp || bestCandidate.score - runnerUp.score >= 2;

  if (!hasConfidenceThreshold) {
    return {
      property: null,
      trace: {
        status: "no-match",
        propertyId: null,
        propertyTitle: null,
        score: bestCandidate.score,
        consideredSignals: signals.consideredSignals,
        shortlist,
        reasons: [
          "There was some overlap with inventory, but not enough evidence to assign a property safely.",
        ],
      },
    };
  }

  if (!hasClearLead) {
    return {
      property: null,
      trace: {
        status: "no-match",
        propertyId: null,
        propertyTitle: null,
        score: bestCandidate.score,
        consideredSignals: signals.consideredSignals,
        shortlist,
        reasons: [
          `Multiple properties looked similarly relevant, so the system kept the lead unassigned for manual review.`,
        ],
      },
    };
  }

  return {
    property: mapProperty(bestCandidate.property),
    trace: {
      status: "matched",
      propertyId: bestCandidate.property.id,
      propertyTitle: bestCandidate.property.title,
      score: bestCandidate.score,
      consideredSignals: signals.consideredSignals,
      shortlist: [],
      reasons: bestCandidate.reasons,
    },
  };
}
