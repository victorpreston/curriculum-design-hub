import {
  citedSourceIds,
  lessonSections,
  type GroundingReport,
  type GroundingStatus,
  type LessonPlanContent,
  type SourceScore,
} from '@hub/shared';

export interface GroundingResult {
  content: LessonPlanContent;
  report: GroundingReport;
}

interface CitationFacts {
  validCitationCount: number;
  removedCitationCount: number;
  uncitedActivityCount: number;
  weaklySupportedSectionCount: number;
}

function keepOnly<T extends { sourceIds: string[] }>(section: T, allowed: Set<string>): T {
  return { ...section, sourceIds: section.sourceIds.filter((id) => allowed.has(id)) };
}

function withoutUnretrievedCitations(
  content: LessonPlanContent,
  allowed: Set<string>,
): LessonPlanContent {
  return {
    ...content,
    starter: keepOnly(content.starter, allowed),
    mainActivities: content.mainActivities.map((activity) => keepOnly(activity, allowed)),
    checkForUnderstanding: keepOnly(content.checkForUnderstanding, allowed),
  };
}

function bestSimilarityOf(ids: string[], similarityById: Map<string, number>): number {
  return Math.max(0, ...ids.map((id) => similarityById.get(id) ?? 0));
}

function groundingStatusOf(facts: CitationFacts): GroundingStatus {
  if (facts.validCitationCount === 0) return 'ungrounded';
  const hasWarning =
    facts.removedCitationCount > 0 ||
    facts.uncitedActivityCount > 0 ||
    facts.weaklySupportedSectionCount > 0;
  return hasWarning ? 'weak' : 'grounded';
}

function notesFor(
  facts: CitationFacts,
  removedCitationIds: string[],
  weakSimilarityThreshold: number,
): string[] {
  const notes: string[] = [];
  if (removedCitationIds.length > 0) {
    notes.push(
      `Removed ${removedCitationIds.length} citation(s) to sources that were not retrieved for this outcome: ${removedCitationIds.join(', ')}.`,
    );
  }
  if (facts.validCitationCount === 0) {
    notes.push('No section cites a retrieved curriculum source. Treat this plan as unverified.');
    return notes;
  }
  if (facts.uncitedActivityCount > 0) {
    notes.push(
      `${facts.uncitedActivityCount} main activit${facts.uncitedActivityCount === 1 ? 'y has' : 'ies have'} no source.`,
    );
  }
  if (facts.weaklySupportedSectionCount > 0) {
    notes.push(
      `${facts.weaklySupportedSectionCount} section(s) cite only weakly matching sources (similarity below ${weakSimilarityThreshold}).`,
    );
  }
  return notes;
}

export function assessGrounding(
  content: LessonPlanContent,
  retrieved: SourceScore[],
  weakSimilarityThreshold: number,
): GroundingResult {
  const similarityById = new Map(retrieved.map((source) => [source.chunkId, source.similarity]));
  const allowed = new Set(similarityById.keys());
  const removedCitationIds = citedSourceIds(content).filter((id) => !allowed.has(id));
  const cleaned = withoutUnretrievedCitations(content, allowed);
  const validCitations = citedSourceIds(cleaned);
  const citedSections = lessonSections(cleaned).filter((section) => section.sourceIds.length > 0);

  const facts: CitationFacts = {
    validCitationCount: validCitations.length,
    removedCitationCount: removedCitationIds.length,
    uncitedActivityCount: cleaned.mainActivities.filter(
      (activity) => activity.sourceIds.length === 0,
    ).length,
    weaklySupportedSectionCount: citedSections.filter(
      (section) => bestSimilarityOf(section.sourceIds, similarityById) < weakSimilarityThreshold,
    ).length,
  };

  return {
    content: cleaned,
    report: {
      status: groundingStatusOf(facts),
      validCitationCount: facts.validCitationCount,
      removedCitationIds,
      bestSimilarity: Number(bestSimilarityOf(validCitations, similarityById).toFixed(4)),
      notes: notesFor(facts, removedCitationIds, weakSimilarityThreshold),
    },
  };
}
