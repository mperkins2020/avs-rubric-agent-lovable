import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CompanyProfile, RubricScore, ObservabilityData } from "@/types/rubric";

interface ExportData {
  companyProfile: CompanyProfile;
  rubricScore: RubricScore;
  observability: ObservabilityData;
}

// jspdf-autotable augments the jsPDF instance with lastAutoTable at runtime
type jsPDFWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

const COLORS = {
  primary: [79, 70, 229] as [number, number, number], // Indigo
  success: [34, 197, 94] as [number, number, number], // Green
  warning: [234, 179, 8] as [number, number, number], // Yellow
  danger: [239, 68, 68] as [number, number, number], // Red
  muted: [107, 114, 128] as [number, number, number], // Gray
  dark: [17, 24, 39] as [number, number, number], // Dark gray
};

function getScoreColor(score: number): [number, number, number] {
  if (score === 2) return COLORS.success;
  if (score === 1) return COLORS.warning;
  return COLORS.danger;
}

function getBandColor(band: string): [number, number, number] {
  switch (band) {
    case "Advanced":
      return COLORS.success;
    case "Established":
      return [34, 211, 238]; // Cyan
    case "Emerging":
      return COLORS.warning;
    default:
      return COLORS.danger;
  }
}

export function exportToPDF({ companyProfile, rubricScore, observability }: ExportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Helper to add new page if needed
  const checkPageBreak = (height: number) => {
    if (yPos + height > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Title
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.primary);
  doc.text("AVS Rubric Report", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // Evidence-based assessment statement (left-aligned)
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  const disclaimerText = "This is an evidence-based assessment of your product's external value-system legibility, based on publicly available information at the time of analysis.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 40);
  doc.text(disclaimerLines, 20, yPos);
  yPos += disclaimerLines.length * 4 + 8;

  // Company name
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.dark);
  doc.text(companyProfile.companyName, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Date
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Generated on ${new Date().toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  })}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Score Summary Box
  doc.setFillColor(...getBandColor(rubricScore.band));
  doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  const scorePercentage = Math.round((rubricScore.totalScore / rubricScore.maxScore) * 100);
  doc.text(`${rubricScore.totalScore}/${rubricScore.maxScore} (${scorePercentage}%)`, pageWidth / 2, yPos + 12, { align: "center" });
  doc.setFontSize(12);
  doc.text(`${rubricScore.band} Stage`, pageWidth / 2, yPos + 22, { align: "center" });
  yPos += 40;

  // Company Profile Section
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(14);
  doc.text("Company Profile", 20, yPos);
  yPos += 8;

  const profileData = [
    ["Description", companyProfile.oneLineDescription],
    ["Mission", companyProfile.missionOrPositioning],
    ["Primary Users", companyProfile.primaryUsers],
    ["Economic Buyer", companyProfile.economicBuyerGuess],
    ["ICP", companyProfile.icpGuess.join(", ")],
    ["Product Surface", companyProfile.productSurface.toUpperCase()],
    ["Pricing Model", companyProfile.pricingModelGuess.charAt(0).toUpperCase() + companyProfile.pricingModelGuess.slice(1)],
    ["Value Unit", companyProfile.valueUnitGuess],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: profileData,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: "auto" },
    },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;

  // Observability Section
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.dark);
  doc.text("Observability", 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Level: ${observability.level} • Confidence: ${observability.confidenceScore}%`, 20, yPos);
  yPos += 10;
  doc.text(`Pages analyzed: ${observability.pagesUsed.length}`, 20, yPos);
  yPos += 8;

  // List each page used
  observability.pagesUsed.forEach((page) => {
    checkPageBreak(6);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    const pageLine = doc.splitTextToSize(`• ${page}`, pageWidth - 50);
    doc.text(pageLine, 25, yPos);
    yPos += pageLine.length * 4 + 2;
  });
  yPos += 8;

  // Dimension Scores Table
  checkPageBreak(50);
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.dark);
  doc.text("Dimension Scores", 20, yPos);
  yPos += 8;

  const dimensionTableData = rubricScore.dimensionScores.map((dim) => [
    dim.dimension,
    dim.notObservable ? "N/O" : `${dim.score}/2`,
    `${Math.round(dim.confidence * 100)}%`,
    dim.rationale,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Dimension", "Score", "Conf.", "Rationale"]],
    body: dimensionTableData,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { 
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: "auto" },
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const score = rubricScore.dimensionScores[data.row.index];
        if (score && !score.notObservable) {
          data.cell.styles.textColor = getScoreColor(score.score);
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;

  // Strengths Section
  checkPageBreak(50);
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.success);
  doc.text("Key Strengths", 20, yPos);
  yPos += 8;

  const strengthsData = rubricScore.strengths.map((s) => [
    s.dimension,
    s.whyItIsStrong,
    s.whatItEnables,
  ]);

  if (strengthsData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Dimension", "Why It's Strong", "What It Enables"]],
      body: strengthsData,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: COLORS.success,
        textColor: [255, 255, 255],
      },
      margin: { left: 20, right: 20 },
    });
    yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
  }

  // Weaknesses Section
  checkPageBreak(50);
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.danger);
  doc.text("Areas for Improvement", 20, yPos);
  yPos += 8;

  const weaknessesData = rubricScore.weaknesses.map((w) => [
    w.dimension,
    w.whatIsMissingOrUnclear,
    w.whyItMatters,
  ]);

  if (weaknessesData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Dimension", "What's Missing", "Why It Matters"]],
      body: weaknessesData,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: COLORS.danger,
        textColor: [255, 255, 255],
      },
      margin: { left: 20, right: 20 },
    });
    yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
  }

  // Recommended Focus Section
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text("Recommended Focus", 20, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text(rubricScore.recommendedFocus.focusArea, 20, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  const whyLines = doc.splitTextToSize(rubricScore.recommendedFocus.why, pageWidth - 40);
  doc.text(whyLines, 20, yPos);
  yPos += whyLines.length * 5 + 8;

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  doc.text("First Two Actions:", 20, yPos);
  yPos += 6;

  rubricScore.recommendedFocus.firstTwoActions.forEach((action, i) => {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    const actionLines = doc.splitTextToSize(`${i + 1}. ${action}`, pageWidth - 45);
    doc.text(actionLines, 25, yPos);
    yPos += actionLines.length * 5 + 3;
  });

  yPos += 5;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  doc.text("What to Measure:", 20, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  const measureLines = doc.splitTextToSize(rubricScore.recommendedFocus.whatToMeasure, pageWidth - 40);
  doc.text(measureLines, 20, yPos);

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(
      `Page ${i} of ${pageCount} • AVS Rubric Report`,
      pageWidth / 2,
      pageHeight - 14,
      { align: "center" }
    );
    doc.text(
      "Created by ValueTempo. For more information about the report, contact us at gtm@valuetempo.com.",
      pageWidth / 2,
      pageHeight - 9,
      { align: "center" }
    );
  }

  // Save the PDF
  const sanitizedName = companyProfile.companyName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`${sanitizedName}_avs_rubric_report.pdf`);
}
