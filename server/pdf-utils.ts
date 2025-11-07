/**
 * PDF 생성 유틸리티
 * - 이미지를 PDF로 변환
 * - 여러 서류를 하나의 PDF로 합치기
 */

import PDFDocument from "pdfkit";
import axios from "axios";

export interface DocumentInfo {
  name: string;
  url: string;
  expiryDate?: string;
}

/**
 * 이미지 URL을 PDF로 변환
 * @param imageUrl 이미지 URL
 * @returns PDF Buffer
 */
export async function imageToPdf(imageUrl: string): Promise<Buffer> {
  try {
    // 이미지 다운로드
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(response.data);

    // PDF 생성
    const doc = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));

    // A4 사이즈로 페이지 추가
    doc.addPage({ size: "A4" });

    // 이미지를 페이지에 맞춤
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    doc.image(imageBuffer, 0, 0, {
      fit: [pageWidth, pageHeight],
      align: "center",
      valign: "center",
    });

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on("error", reject);
    });
  } catch (error) {
    console.error("[PDF] Image to PDF conversion failed:", error);
    throw new Error("이미지를 PDF로 변환하는데 실패했습니다.");
  }
}

/**
 * 여러 서류를 하나의 PDF로 합치기
 * @param documents 서류 정보 배열
 * @param title PDF 제목
 * @returns PDF Buffer
 */
export async function combineDocumentsToPdf(
  documents: DocumentInfo[],
  title: string
): Promise<Buffer> {
  try {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));

    // 표지 페이지
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(title, { align: "center" });

    doc.moveDown(2);
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`생성일: ${new Date().toLocaleDateString("ko-KR")}`, { align: "center" });

    doc.moveDown(1);
    doc
      .fontSize(10)
      .text(`총 ${documents.length}개 서류`, { align: "center" });

    // 각 서류 추가
    for (let i = 0; i < documents.length; i++) {
      const docInfo = documents[i];

      // 새 페이지
      doc.addPage();

      // 서류 제목
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(`${i + 1}. ${docInfo.name}`, { underline: true });

      doc.moveDown(0.5);

      if (docInfo.expiryDate) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .text(`만료일: ${new Date(docInfo.expiryDate).toLocaleDateString("ko-KR")}`);
        doc.moveDown(1);
      }

      try {
        // 이미지 다운로드
        const response = await axios.get(docInfo.url, { responseType: "arraybuffer" });
        const imageBuffer = Buffer.from(response.data);

        // 이미지 추가 (페이지 여백 고려)
        const maxWidth = doc.page.width - 100; // 좌우 여백 50씩
        const maxHeight = doc.page.height - 200; // 상하 여백 + 제목 공간

        doc.image(imageBuffer, 50, doc.y, {
          fit: [maxWidth, maxHeight],
          align: "center",
        });
      } catch (imgError) {
        console.error(`[PDF] Failed to load image for ${docInfo.name}:`, imgError);
        doc
          .fontSize(10)
          .fillColor("red")
          .text("(이미지 로딩 실패)", { align: "center" });
        doc.fillColor("black");
      }
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on("error", reject);
    });
  } catch (error) {
    console.error("[PDF] Combine documents failed:", error);
    throw new Error("서류를 PDF로 합치는데 실패했습니다.");
  }
}

/**
 * 반입 요청의 모든 서류를 하나의 PDF로 생성
 * @param entryRequest 반입 요청 정보
 * @param equipmentDocs 장비 서류 목록
 * @param workerDocs 인력 서류 목록
 * @returns PDF Buffer
 */
export async function createEntryRequestPdf(
  entryRequest: any,
  equipmentDocs: DocumentInfo[],
  workerDocs: DocumentInfo[]
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  const buffers: Buffer[] = [];
  doc.on("data", buffers.push.bind(buffers));

  // 표지
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("반입 요청 서류", { align: "center" });

  doc.moveDown(2);
  doc
    .fontSize(14)
    .font("Helvetica")
    .text(`요청 번호: ${entryRequest.requestNumber || "N/A"}`);

  doc.moveDown(0.5);
  doc
    .fontSize(12)
    .text(`생성일: ${new Date().toLocaleDateString("ko-KR")}`);

  doc.moveDown(0.5);
  doc
    .text(`반입 목적: ${entryRequest.purpose || "N/A"}`);

  doc.moveDown(1);
  doc
    .fontSize(10)
    .text(`총 서류: 장비 ${equipmentDocs.length}개, 인력 ${workerDocs.length}개`);

  // 장비 서류
  if (equipmentDocs.length > 0) {
    doc.addPage();
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("장비 서류", { underline: true });
    doc.moveDown(1);

    for (let i = 0; i < equipmentDocs.length; i++) {
      const docInfo = equipmentDocs[i];
      doc.addPage();
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(`${i + 1}. ${docInfo.name}`);

      if (docInfo.expiryDate) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .text(`만료일: ${new Date(docInfo.expiryDate).toLocaleDateString("ko-KR")}`);
      }
      doc.moveDown(1);

      try {
        const response = await axios.get(docInfo.url, { responseType: "arraybuffer" });
        const imageBuffer = Buffer.from(response.data);
        const maxWidth = doc.page.width - 100;
        const maxHeight = doc.page.height - 200;
        doc.image(imageBuffer, 50, doc.y, { fit: [maxWidth, maxHeight], align: "center" });
      } catch (error) {
        doc.fontSize(10).fillColor("red").text("(이미지 로딩 실패)");
        doc.fillColor("black");
      }
    }
  }

  // 인력 서류
  if (workerDocs.length > 0) {
    doc.addPage();
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("인력 서류", { underline: true });
    doc.moveDown(1);

    for (let i = 0; i < workerDocs.length; i++) {
      const docInfo = workerDocs[i];
      doc.addPage();
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(`${i + 1}. ${docInfo.name}`);

      if (docInfo.expiryDate) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .text(`만료일: ${new Date(docInfo.expiryDate).toLocaleDateString("ko-KR")}`);
      }
      doc.moveDown(1);

      try {
        const response = await axios.get(docInfo.url, { responseType: "arraybuffer" });
        const imageBuffer = Buffer.from(response.data);
        const maxWidth = doc.page.width - 100;
        const maxHeight = doc.page.height - 200;
        doc.image(imageBuffer, 50, doc.y, { fit: [maxWidth, maxHeight], align: "center" });
      } catch (error) {
        doc.fontSize(10).fillColor("red").text("(이미지 로딩 실패)");
        doc.fillColor("black");
      }
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on("error", reject);
  });
}
