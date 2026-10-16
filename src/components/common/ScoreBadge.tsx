import React from 'react';
import { ConfidenceLevel, FactCheckStatus, RightsStatus, MatchHierarchyLevel } from '../../types';
import { ShieldCheck, AlertTriangle, HelpCircle, CheckCircle, XCircle, Info } from 'lucide-react';

export const ConfidenceBadge: React.FC<{ level: ConfidenceLevel }> = ({ level }) => {
  switch (level) {
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          HIGH CONFIDENCE
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Info className="w-3 h-3 text-amber-400" />
          MEDIUM
        </span>
      );
    case 'LOW':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-orange-500/15 text-orange-300 border border-orange-500/30">
          <AlertTriangle className="w-3 h-3 text-orange-400" />
          LOW CONFIDENCE
        </span>
      );
    case 'UNRESOLVED':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
          <HelpCircle className="w-3 h-3 text-rose-400" />
          UNRESOLVED
        </span>
      );
  }
};

export const FactCheckBadge: React.FC<{ status: FactCheckStatus }> = ({ status }) => {
  switch (status) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          VERIFIED
        </span>
      );
    case 'SUPPORTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-sky-500/20 text-sky-300 border border-sky-500/40">
          <Info className="w-3 h-3 text-sky-400" />
          SUPPORTED
        </span>
      );
    case 'DISPUTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          DISPUTED
        </span>
      );
    case 'UNVERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-stone-700/50 text-stone-300 border border-stone-600">
          <HelpCircle className="w-3 h-3 text-stone-400" />
          UNVERIFIED
        </span>
      );
    case 'INCORRECT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
          <XCircle className="w-3 h-3 text-rose-400" />
          INCORRECT
        </span>
      );
  }
};

export const RightsBadge: React.FC<{ status: RightsStatus; license?: string }> = ({ status, license }) => {
  switch (status) {
    case 'PUBLIC_DOMAIN':
      return (
        <span
          title={license || 'Public Domain'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        >
          PUBLIC DOMAIN
        </span>
      );
    case 'CREATIVE_COMMONS':
      return (
        <span
          title={license || 'Creative Commons'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30"
        >
          CC / ATTRIBUTION
        </span>
      );
    case 'EDITORIAL_ARCHIVE':
      return (
        <span
          title={license || 'Editorial Archive'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30"
        >
          EDITORIAL ARCHIVE
        </span>
      );
    case 'RIGHTS_UNCERTAIN':
    default:
      return (
        <span
          title="Rights clearance uncertain"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
        >
          ⚠ RIGHTS UNCERTAIN
        </span>
      );
  }
};

export const MatchHierarchyBadge: React.FC<{ level: MatchHierarchyLevel }> = ({ level }) => {
  const map: Record<MatchHierarchyLevel, { label: string; color: string }> = {
    LEVEL_1_EXACT_EVENT: { label: 'L1: Exact Event Match', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    LEVEL_2_SAME_EVENT_DIFFERENT_MOMENT: { label: 'L2: Same Event (Diff Moment)', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
    LEVEL_3_SAME_SUBJECT_LOCATION: { label: 'L3: Same Subject & Location', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    LEVEL_4_SAME_SUBJECT_PERIOD: { label: 'L4: Same Subject & Period', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    LEVEL_5_SAME_CAMPAIGN: { label: 'L5: Same Campaign / Theatre', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
    LEVEL_6_CONCEPTUAL: { label: 'L6: Conceptual Archival', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    LEVEL_7_MAP_DOCUMENT: { label: 'L7: Tactical Map / Document', color: 'bg-amber-600/20 text-amber-300 border-amber-600/40' },
    LEVEL_8_CONTEMPORARY_LOCATION: { label: 'L8: Contemporary Location', color: 'bg-stone-500/20 text-stone-300 border-stone-500/40' },
    LEVEL_9_AI_RECONSTRUCTION: { label: 'L9: AI Reconstruction (Labeled)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  };

  const item = map[level] || map.LEVEL_6_CONCEPTUAL;
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${item.color}`}>
      {item.label}
    </span>
  );
};
