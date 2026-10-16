import JSZip from 'jszip';
import { DocumentaryProject } from '../types';

export class ZipExporter {
  static async exportProjectPackage(project: DocumentaryProject): Promise<{ blob: Blob; filename: string }> {
    const zip = new JSZip();

    const safeTitle = (project.title || 'Kindra_Documentary')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipFilename = `KINDRA_${safeTitle}_${timestamp}.zip`;

    // 01_SCRIPT
    const scriptFolder = zip.folder('01_SCRIPT');
    if (scriptFolder) {
      let scriptTxt = `=======================================================\n`;
      scriptTxt += `KINDRA DOCUMENTARY SCRIPT: ${project.title || 'Untitled'}\n`;
      scriptTxt += `Subject: ${project.subject || 'N/A'}\n`;
      scriptTxt += `Narrative Mode: ${project.narrativeMode}\n`;
      scriptTxt += `Target Duration: ${project.targetDurationMinutes} min | Target WPM: ${project.targetWpm}\n`;
      scriptTxt += `Generated: ${new Date().toLocaleString()}\n`;
      scriptTxt += `=======================================================\n\n`;

      let timestampTxt = `TIMESTAMPS & CUE SHEET\n=====================\n\n`;
      let runningTime = 0;

      if (project.scriptBeats && project.scriptBeats.length > 0) {
        project.scriptBeats.forEach((beat, idx) => {
          const duration = beat.estimatedDurationSeconds || 60;
          const startMin = Math.floor(runningTime / 60);
          const startSec = Math.floor(runningTime % 60);
          const endMin = Math.floor((runningTime + duration) / 60);
          const endSec = Math.floor((runningTime + duration) % 60);

          const timecodeStr = `[${String(startMin).padStart(2, '0')}:${String(startSec).padStart(2, '0')} - ${String(endMin).padStart(2, '0')}:${String(endSec).padStart(2, '0')}]`;

          scriptTxt += `BEAT ${beat.beatNumber || idx + 1}: ${beat.title.toUpperCase()} (${beat.beatType})\n`;
          scriptTxt += `TIMECODE: ${timecodeStr} (~${duration}s | ${beat.wordCount} words)\n`;
          if (beat.deliveryDirective) {
            scriptTxt += `DELIVERY DIRECTIVE: [${beat.deliveryDirective}]\n`;
          }
          scriptTxt += `-------------------------------------------------------\n`;
          scriptTxt += `${beat.narrationText}\n\n\n`;

          timestampTxt += `${timecodeStr} | BEAT ${beat.beatNumber || idx + 1}: ${beat.title} (${duration}s)\n`;
          runningTime += duration;
        });
      } else {
        scriptTxt += `No script beats generated yet.\n`;
        timestampTxt += `No timestamps available.\n`;
      }

      scriptFolder.file('final_script.txt', scriptTxt);
      scriptFolder.file('timestamps.txt', timestampTxt);
    }

    // 02_VOICEOVER
    const voiceFolder = zip.folder('02_VOICEOVER');
    if (voiceFolder) {
      voiceFolder.file(
        'voice_manifest.txt',
        `Voice Selected: ${project.voiceover?.selectedVoiceId || 'Default'}\nOverall Delivery: ${project.voiceover?.overallDeliveryInstruction || 'Authoritative Documentary'}\nSegments count: ${project.voiceover?.segments?.length || 0}\n`
      );

      if (project.voiceover?.segments && project.voiceover.segments.length > 0) {
        project.voiceover.segments.forEach((seg, i) => {
          const numStr = String(i + 1).padStart(2, '0');
          const cleanName = seg.filename || `${numStr}_beat_${seg.beatNumber}.wav`;
          if (seg.audioBase64) {
            voiceFolder.file(cleanName, seg.audioBase64, { base64: true });
          } else {
            voiceFolder.file(`${cleanName}.meta.txt`, `Duration: ${seg.durationSeconds}s\nDirective: ${seg.deliveryDirective}\n`);
          }
        });
      }
    }

    // 03_VISUALS
    const visualsFolder = zip.folder('03_VISUALS');
    if (visualsFolder) {
      let visualGuide = `VISUAL ASSETS SPECIFICATION\n===========================\n\n`;
      if (project.visualAssets && project.visualAssets.length > 0) {
        project.visualAssets.forEach((asset, idx) => {
          visualGuide += `ASSET #${idx + 1}: ${asset.title}\n`;
          visualGuide += `Type: ${asset.visualType} | Match Level: ${asset.hierarchyLevel} (${asset.matchScore}%)\n`;
          visualGuide += `Source: ${asset.sourceInstitution} (${asset.source})\n`;
          visualGuide += `Rights: ${asset.rightsStatus} (${asset.license})\n`;
          visualGuide += `Attribution: ${asset.attributionRequirement}\n`;
          visualGuide += `Image URL: ${asset.fullImageUrl}\n`;
          if (asset.isIllustrativeSubstitute) {
            visualGuide += `NOTE: [Illustrative Substitute] ${asset.substituteExplanation || ''}\n`;
          }
          visualGuide += `----------------------------------------------------------\n\n`;
        });
      }
      visualsFolder.file('visual_assets_guide.txt', visualGuide);
    }

    // 04_MAPS
    const mapsFolder = zip.folder('04_MAPS');
    if (mapsFolder) {
      mapsFolder.file(
        'maps_and_graphics.txt',
        `MAPS & TACTICAL GRAPHICS GUIDE\n==============================\nSubject: ${project.subject}\nLocations referenced: ${project.researchData?.locations?.map(l => l.name).join(', ') || 'N/A'}\nRecommended resolution: 4K 3840x2160\nRecommended motion: Slow pan / subtle zoom (0.5% scale per sec).\n`
      );
    }

    // 05_PROJECT
    const projectFolder = zip.folder('05_PROJECT');
    if (projectFolder) {
      // visual_manifest.csv
      let visualCsv = `Asset ID,Filename,Timestamp,Narration Cue,Visual Description,Source Institution,Match Score,Historical Confidence,Rights Status,License,Attribution Requirement,Substitution Status\n`;
      if (project.visualAssets && project.visualAssets.length > 0) {
        project.visualAssets.forEach((ast, i) => {
          const row = [
            `"${ast.id}"`,
            `"${String(i + 1).padStart(3, '0')}_${ast.title.replace(/"/g, '""')}.jpg"`,
            `"00:${String(i * 5).padStart(2, '0')}"`,
            `"${ast.description.replace(/"/g, '""').substring(0, 80)}"`,
            `"${ast.title.replace(/"/g, '""')}"`,
            `"${ast.sourceInstitution.replace(/"/g, '""')}"`,
            `"${ast.matchScore}%"`,
            `"${ast.historicalConfidence}"`,
            `"${ast.rightsStatus}"`,
            `"${ast.license.replace(/"/g, '""')}"`,
            `"${ast.attributionRequirement.replace(/"/g, '""')}"`,
            `"${ast.isIllustrativeSubstitute ? 'Illustrative Substitute' : 'Authentic Match'}"`,
          ];
          visualCsv += row.join(',') + '\n';
        });
      }
      projectFolder.file('visual_manifest.csv', visualCsv);

      // timeline.csv
      let timelineCsv = `Track,Item,Start Time (s),End Time (s),Duration (s),Type,Description,Treatment\n`;
      if (project.visualCues && project.visualCues.length > 0) {
        project.visualCues.forEach((cue, i) => {
          timelineCsv += `Visual,V_${String(i + 1).padStart(3, '0')},${cue.timestampStart},${cue.timestampEnd},${cue.duration},${cue.preferredVisualType},"${cue.requiredMeaning.replace(/"/g, '""')}","subtle_pan_zoom"\n`;
        });
      }
      projectFolder.file('timeline.csv', timelineCsv);

      // production_notes.txt
      let prodNotes = `KINDRA PRODUCTION NOTES & EDITORIAL SUMMARY\n============================================\n`;
      prodNotes += `Project ID: ${project.id}\n`;
      prodNotes += `Title: ${project.title}\n`;
      prodNotes += `Subject: ${project.subject}\n`;
      prodNotes += `Narrative Mode: ${project.narrativeMode}\n`;
      prodNotes += `Audience Retention Score: ${project.retentionAudit?.score || 90}/100\n`;
      prodNotes += `Retention Verdict: ${project.retentionAudit?.overallVerdict || 'Optimized for high retention.'}\n`;
      prodNotes += `Fact Check Summary: ${project.factCheckReport?.verifiedCount || 0} Verified, ${project.factCheckReport?.supportedCount || 0} Supported, ${project.factCheckReport?.disputedCount || 0} Disputed.\n\n`;
      prodNotes += `CAPCUT EDITING INSTRUCTIONS:\n`;
      prodNotes += `1. Import 02_VOICEOVER audio segments onto Main Audio Track.\n`;
      prodNotes += `2. Import Visual Assets from 03_VISUALS onto Main Video Track.\n`;
      prodNotes += `3. Snap visual transitions to timestamps listed in 05_PROJECT/timeline.csv.\n`;
      prodNotes += `4. Apply subtle keyframe scale (100% to 104%) across 4-6s photograph holds for cinematic cadence.\n`;
      prodNotes += `5. Include attribution credits from 06_SOURCES/attribution.txt in the end titles.\n`;
      projectFolder.file('production_notes.txt', prodNotes);
    }

    // 06_SOURCES
    const sourcesFolder = zip.folder('06_SOURCES');
    if (sourcesFolder) {
      let sourcesCsv = `Claim ID,Fact Statement,Source Type,Primary Archive / Reference,Confidence,Verified\n`;
      if (project.researchData?.claims && project.researchData.claims.length > 0) {
        project.researchData.claims.forEach(c => {
          sourcesCsv += `"${c.id}","${c.claim.replace(/"/g, '""')}","${c.sourceType}","${c.primarySource.replace(/"/g, '""')}","${c.confidence}","${c.verified ? 'YES' : 'NO'}"\n`;
        });
      }
      sourcesFolder.file('sources.csv', sourcesCsv);

      let attributionTxt = `DOCUMENTARY ATTRIBUTION & CITATIONS\n===================================\n\n`;
      attributionTxt += `ARCHIVAL IMAGERY COURTESY OF:\n`;
      if (project.visualAssets && project.visualAssets.length > 0) {
        const attributions = Array.from(new Set(project.visualAssets.map(a => a.attributionRequirement)));
        attributions.forEach(att => {
          attributionTxt += `• ${att}\n`;
        });
      } else {
        attributionTxt += `• Federal Archives / Public Domain Collections\n`;
      }
      attributionTxt += `\nHISTORICAL RESEARCH REFERENCES:\n`;
      if (project.researchData?.claims && project.researchData.claims.length > 0) {
        const uniqueSources = Array.from(new Set(project.researchData.claims.map(c => c.primarySource)));
        uniqueSources.forEach(s => {
          attributionTxt += `• ${s}\n`;
        });
      }
      sourcesFolder.file('attribution.txt', attributionTxt);

      let rightsTxt = `RIGHTS & REUSE CLEARANCE SUMMARY\n================================\n`;
      rightsTxt += `Strict Principle: Historical verification and legal rights clearance are tracked independently.\n\n`;
      rightsTxt += `All assets have been classified into:\n`;
      rightsTxt += `- PUBLIC DOMAIN: Expired copyright or official government institutional archives.\n`;
      rightsTxt += `- CREATIVE COMMONS: Attribution-licensed with required credit strings in attribution.txt.\n`;
      rightsTxt += `- EDITORIAL ARCHIVE: Approved for historical documentary analysis with citation.\n`;
      sourcesFolder.file('rights_notes.txt', rightsTxt);
    }

    // Generate zip blob
    const contentBlob = await zip.generateAsync({ type: 'blob' });
    return { blob: contentBlob, filename: zipFilename };
  }

  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
