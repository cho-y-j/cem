import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";
import { sendEntryRequestNotification, sendWorkJournalNotification } from "./_core/email";
import { sendEmergencyNotification, saveLocationTracking, EmergencyReport, LocationTracking } from "./_core/emergency";
import { storagePut } from "./storage";
import { entryRequestsRouter } from "./entry-request-router-new";
import { entryRequestsRouterV2 } from "./entry-request-router-v2";
import { mobileRouter } from "./mobile-router";
import { authPinRouter } from "./auth-pin-router";
import { deploymentRouter } from "./deployment-router";
import { companiesRouter } from "./companies-router";
import { locationRouter } from "./location-router";
import { emergencyRouter } from "./emergency-router";
import { usersRouter } from "./users-router";
import { workJournalRouter } from "./work-journal-router";
import { safetyInspectionRouter } from "./safety-inspection-router";
import { driverInspectionRouter } from "./driver-inspection-router";
import { workZoneRouter } from "./work-zone-router";
import { checkInRouter } from "./check-in-router";
import { webauthnRouter } from "./webauthn-router";
import { imageToPdf, createEntryRequestPdf } from "./pdf-utils";

// ============================================================
// 관리자 전용 프로시저
// ============================================================

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role?.toLowerCase() !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
  }
  return next({ ctx });
});

// ============================================================
// 라우터 정의
// ============================================================

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      const user = ctx.user;
      if (!user) return null;

      // 회사 정보 가져오기
      let companyName = null;
      if (user.companyId) {
        const company = await db.getCompanyById(user.companyId);
        companyName = company?.name || null;
      }

      return {
        ...user,
        companyName,
      };
    }),

    // 이메일/비밀번호 로그인
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        console.log('[Auth] Login attempt:', input.email);
        const { hashPassword, verifyPassword } = await import("./_core/password");
        const user = await db.getUserByEmail(input.email);

        if (!user) {
          console.log('[Auth] User not found:', input.email);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "이메일 또는 비밀번호가 올바르지 않습니다."
          });
        }

        console.log('[Auth] User found:', user.email, 'Role:', user.role);
        console.log('[Auth] Has password:', !!user.password);

        if (!user.password || !verifyPassword(input.password, user.password)) {
          console.log('[Auth] Password verification failed');
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "이메일 또는 비밀번호가 올바르지 않습니다."
          });
        }

        console.log('[Auth] Password verified successfully');

        // JWT 토큰 생성 및 쿠키 설정 (sdk.createSessionToken 사용)
        // createSessionToken(userId, options) 형식으로 호출
        const token = await sdk.createSessionToken(user.id, {
          name: user.name || user.email || "Unknown",
          email: user.email,
          role: user.role,
          companyId: user.companyId || null,
        });

        console.log('[Auth] JWT token created successfully for user:', user.email, 'companyId:', user.companyId);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        
        return { user };
      }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================================
  // 사용자 관리 (관리자 전용)
  // ============================================================

  users: usersRouter,

  // ============================================================
  // 장비 종류 관리 (관리자 전용)
  // ============================================================

  equipTypes: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllEquipTypes();
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          checklistFormId: z.string().optional(),
          requiredDocs: z.array(z.object({
            docName: z.string(),
            isMandatory: z.boolean(),
            hasExpiry: z.boolean(),
          })).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = nanoid();
        const { requiredDocs, ...equipTypeData } = input;
        await db.createEquipType({ id, ...equipTypeData });
        
        // 필수 서류 등록
        if (requiredDocs && requiredDocs.length > 0) {
          for (const doc of requiredDocs) {
            await db.createTypeDoc({
              id: nanoid(),
              equipTypeId: id,
              ...doc,
            });
          }
        }
        
        return { id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          checklistFormId: z.string().optional(),
          requiredDocs: z.array(z.object({
            docName: z.string(),
            isMandatory: z.boolean(),
            hasExpiry: z.boolean(),
          })).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, requiredDocs, ...data } = input;
        await db.updateEquipType(id, data);
        
        // 기존 필수 서류 삭제 후 재등록
        if (requiredDocs !== undefined) {
          const existingDocs = await db.getTypeDocsByEquipType(id);
          for (const doc of existingDocs) {
            await db.deleteTypeDoc(doc.id);
          }
          
          for (const doc of requiredDocs) {
            await db.createTypeDoc({
              id: nanoid(),
              equipTypeId: id,
              ...doc,
            });
          }
        }
        
        return { success: true };
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteEquipType(input.id);
      return { success: true };
    }),
  }),

  // ============================================================
  // 장비별 필수 서류 관리 (관리자 전용)
  // ============================================================

  typeDocs: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllTypeDocs();
    }),

    listByEquipType: protectedProcedure.input(z.object({ equipTypeId: z.string() })).query(async ({ input }) => {
      return await db.getTypeDocsByEquipType(input.equipTypeId);
    }),

    create: adminProcedure
      .input(
        z.object({
          equipTypeId: z.string(),
          docName: z.string(),
          isMandatory: z.boolean().default(true),
          hasExpiry: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        const id = nanoid();
        await db.createTypeDoc({ id, ...input });
        return { id };
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteTypeDoc(input.id);
      return { success: true };
    }),
  }),

  // ============================================================
  // 인력 유형 관리 (관리자 전용)
  // ============================================================

  workerTypes: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllWorkerTypes();
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          licenseRequired: z.boolean().default(false).optional(), // 면허 인증 필수 여부
          requiredDocs: z.array(z.object({
            docName: z.string(),
            isMandatory: z.boolean(),
            hasExpiry: z.boolean(),
          })).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = nanoid();
        const { requiredDocs, ...workerTypeData } = input;
        await db.createWorkerType({ id, ...workerTypeData });
        
        // 필수 서류 등록
        if (requiredDocs && requiredDocs.length > 0) {
          for (const doc of requiredDocs) {
            await db.createWorkerDoc({
              id: nanoid(),
              workerTypeId: id,
              ...doc,
            });
          }
        }
        
        return { id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          licenseRequired: z.boolean().optional(), // 면허 인증 필수 여부
          requiredDocs: z.array(z.object({
            docName: z.string(),
            isMandatory: z.boolean(),
            hasExpiry: z.boolean(),
          })).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, requiredDocs, ...data } = input;
        await db.updateWorkerType(id, data);
        
        // 기존 필수 서류 삭제 후 재등록
        if (requiredDocs !== undefined) {
          const existingDocs = await db.getWorkerDocsByWorkerType(id);
          for (const doc of existingDocs) {
            await db.deleteWorkerDoc(doc.id);
          }
          
          for (const doc of requiredDocs) {
            await db.createWorkerDoc({
              id: nanoid(),
              workerTypeId: id,
              ...doc,
            });
          }
        }
        
        return { success: true };
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteWorkerType(input.id);
      return { success: true };
    }),
  }),

  // ============================================================
  // 인력별 필수 서류 관리 (관리자 전용)
  // ============================================================

  workerDocs: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllWorkerDocs();
    }),

    listByWorkerType: protectedProcedure.input(z.object({ workerTypeId: z.string() })).query(async ({ input }) => {
      return await db.getWorkerDocsByWorkerType(input.workerTypeId);
    }),

    create: adminProcedure
      .input(
        z.object({
          workerTypeId: z.string(),
          docName: z.string(),
          isMandatory: z.boolean().default(true),
          hasExpiry: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        const id = nanoid();
        await db.createWorkerDoc({ id, ...input });
        return { id };
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteWorkerDoc(input.id);
      return { success: true };
    }),
  }),

  // ============================================================
  // 안전점검표 템플릿 관리 (관리자 전용)
  // ============================================================

  checklistForms: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllChecklistForms();
    }),

    getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
      return await db.getChecklistFormById(input.id);
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          formJson: z.any(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = nanoid();
        await db.createChecklistForm({ id, ...input, createdBy: ctx.user.id });
        return { id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          formJson: z.any().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateChecklistForm(id, data);
        return { success: true };
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteChecklistForm(input.id);
      return { success: true };
    }),
  }),

  // ============================================================
  // 장비 관리
  // ============================================================

  equipment: router({
    list: protectedProcedure
      .input(
        z
          .object({
            ownerCompanyId: z.string().optional(),
            bpCompanyId: z.string().optional(),
            epCompanyId: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const role = ctx.user.role?.toLowerCase();

        const filters: db.EquipmentFilterOptions = { ...(input || {}) };

        if (role === "bp" && ctx.user.companyId) {
          filters.bpCompanyId = filters.bpCompanyId || ctx.user.companyId;
        } else if (role === "ep" && ctx.user.companyId) {
          filters.epCompanyId = filters.epCompanyId || ctx.user.companyId;
        } else if (role === "owner") {
          filters.ownerId = ctx.user.id;
          if (ctx.user.companyId) {
            filters.ownerCompanyId = filters.ownerCompanyId || ctx.user.companyId;
          }
        }

        return await db.getEquipmentWithFilters(filters);
      }),

    getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
      return await db.getEquipmentById(input.id);
    }),

    listEquipTypes: protectedProcedure.query(async () => {
      return await db.getAllEquipTypes();
    }),

    create: protectedProcedure
      .input(
        z.object({
          equipTypeId: z.string(),
          regNum: z.string(),
          currentBpId: z.string().optional(),
          status: z.string().default("idle"),
          specification: z.string().optional(),
          nfcTagId: z.string().trim().min(1).max(128).optional().nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = nanoid();
        const { nfcTagId, ...data } = input;
        const normalizedTag = typeof nfcTagId === "string" && nfcTagId.trim().length > 0 ? nfcTagId.trim() : null;
        await db.createEquipment({ 
          id, 
          ...data, 
          nfcTagId: normalizedTag, 
          ownerId: ctx.user.id,
          ownerCompanyId: ctx.user.companyId || null // Owner 회사 ID도 함께 저장
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          equipTypeId: z.string().optional(),
          regNum: z.string().optional(),
          currentBpId: z.string().optional(),
          status: z.string().optional(),
          specification: z.string().optional(),
          nfcTagId: z.string().trim().min(1).max(128).optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, nfcTagId, ...data } = input;

        const hasUpdateFields = Object.keys(data).length > 0;
        if (hasUpdateFields) {
          await db.updateEquipment(id, data);
        }

        if (nfcTagId !== undefined) {
          const normalizedTag =
            typeof nfcTagId === "string" && nfcTagId.trim().length > 0
              ? nfcTagId.trim()
              : null;
          await db.assignNfcTagToEquipment(id, normalizedTag);
        }

        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteEquipment(input.id);
      return { success: true };
    }),

    // 장비에 운전자 배정/변경 (Owner 전용)
    assignDriver: protectedProcedure
      .input(
        z.object({
          equipmentId: z.string(),
          workerId: z.string().nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Owner 권한 확인
        if (ctx.user.role?.toLowerCase() !== "owner" && ctx.user.role?.toLowerCase() !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "장비 운영사 권한이 필요합니다." });
        }

        // 장비 조회
        const equipment = await db.getEquipmentById(input.equipmentId);
        if (!equipment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "장비를 찾을 수 없습니다." });
        }

        // Owner 소유 확인
        if (ctx.user.role?.toLowerCase() === "owner" && equipment.ownerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "자신의 장비만 수정할 수 있습니다." });
        }

        // 운전자 존재 확인 (null이 아닌 경우)
        if (input.workerId) {
          const worker = await db.getWorkerById(input.workerId);
          if (!worker) {
            throw new TRPCError({ code: "NOT_FOUND", message: "운전자를 찾을 수 없습니다." });
          }
        }

        // 장비 업데이트
        await db.updateEquipment(input.equipmentId, {
          assignedWorkerId: input.workerId,
        });

        console.log(`[Equipment] 장비 ${input.equipmentId}에 운전자 ${input.workerId || '없음'} 배정`);

        return { success: true };
      }),

    // 장비 + 서류 통합 등록
    createWithDocs: protectedProcedure
      .input(
        z.object({
          equipTypeId: z.string(),
          regNum: z.string(),
          status: z.string().default("idle"),
          specification: z.string().optional(),
          nfcTagId: z.string().trim().min(1).max(128).optional().nullable(),
          docs: z.array(
            z.object({
              docTypeId: z.string(),
              docName: z.string(),
              fileData: z.string(), // base64 encoded file
              fileName: z.string(),
              mimeType: z.string(),
              issueDate: z.string().optional(),
              expiryDate: z.string().optional(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const equipmentId = nanoid();
        const { docs, nfcTagId, ...equipmentData } = input;
        const normalizedTag =
          typeof nfcTagId === "string" && nfcTagId.trim().length > 0
            ? nfcTagId.trim()
            : null;
        
        // 장비 등록
        await db.createEquipment({ 
          id: equipmentId, 
          ...equipmentData, 
          nfcTagId: normalizedTag, 
          ownerId: ctx.user.id,
          ownerCompanyId: ctx.user.companyId || null // Owner 회사 ID도 함께 저장
        });
        
        // 서류 업로드 및 등록
        if (docs && docs.length > 0) {
          for (const doc of docs) {
            try {
              // base64 디코딩
              const buffer = Buffer.from(doc.fileData, 'base64');
              
              // 파일명을 안전하게 처리 (한글 제거 및 URL-safe)
              const fileExtension = doc.fileName.split('.').pop() || 'file';
              const safeFileName = `${nanoid()}.${fileExtension}`;
              
              // Supabase Storage에 파일 업로드
              const filePath = `equipment/${equipmentId}/${safeFileName}`;
              const { url } = await storagePut(filePath, buffer, doc.mimeType);
              
              // 서류 정보 DB 저장
              await db.createDocsCompliance({
                id: nanoid(),
                targetType: "equipment",
                targetId: equipmentId,
                docTypeId: doc.docTypeId,
                docType: doc.docName,
                fileName: doc.fileName,
                fileUrl: url,
                fileSize: buffer.length,
                mimeType: doc.mimeType,
                issueDate: doc.issueDate ? new Date(doc.issueDate) : undefined,
                expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
                uploadedBy: ctx.user.id,
                status: "approved",
              });
              
              console.log(`[Equipment] Document uploaded: ${doc.docName} for equipment ${equipmentId}`);
            } catch (error) {
              console.error("[Equipment] Error uploading document:", error);
              throw error;
            }
          }
        }
        
        return { id: equipmentId };
      }),
  }),

  // ============================================================
  // 인력 관리
  // ============================================================

  workers: router({
    list: protectedProcedure
      .input(
        z
          .object({
            ownerCompanyId: z.string().optional(),
            bpCompanyId: z.string().optional(),
            epCompanyId: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const role = ctx.user.role?.toLowerCase();

        const filters: db.WorkerFilterOptions = { ...(input || {}) };

        if (role === "bp" && ctx.user.companyId) {
          // BP는 자신의 회사에 투입된 인력 + 자신이 생성한 인력 모두 조회
          // bpCompanyId: deployments를 통해 필터링 (투입된 인력)
          // ownerCompanyId: 자신이 생성한 인력 (아직 투입되지 않은 유도원 포함)
          filters.bpCompanyId = filters.bpCompanyId || ctx.user.companyId;
          // BP가 생성한 인력도 함께 조회 (ownerCompanyId로 필터링)
          if (!filters.ownerCompanyId) {
            filters.ownerCompanyId = ctx.user.companyId;
          }
        } else if (role === "ep" && ctx.user.companyId) {
          filters.epCompanyId = filters.epCompanyId || ctx.user.companyId;
        } else if (role === "owner") {
          filters.ownerId = ctx.user.id;
          if (ctx.user.companyId) {
            filters.ownerCompanyId = filters.ownerCompanyId || ctx.user.companyId;
          }
        }

        return await db.getWorkersWithFilters(filters);
      }),

    getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
      return await db.getWorkerById(input.id);
    }),

    // 면허 인증 API (등록 전 미리 검증)
    verifyLicense: protectedProcedure
      .input(
        z.object({
          licenseNo: z.string().length(12, "면허번호는 12자리여야 합니다"),
          name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다"),
          licenseType: z.string().default('12'),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const { verifyDriverLicense } = await import('./_core/rims-api');
          
          console.log(`[License Verify] Verifying license for ${input.name} (${input.licenseNo})`);
          
          const result = await verifyDriverLicense(
            input.licenseNo,
            input.name,
            input.licenseType
          );
          
          console.log(`[License Verify] Result: ${result.isValid ? 'VALID' : 'INVALID'} (${result.resultCode})`);
          
          return result;
        } catch (error: any) {
          console.error('[License Verify] Error:', error.message);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || '면허 인증에 실패했습니다',
          });
        }
      }),

    create: protectedProcedure
      .input(
        z.object({
          workerTypeId: z.string(),
          name: z.string(),
          email: z.string().email(),
          password: z.string().min(6),
          licenseNum: z.string().optional(),
          licenseStatus: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = nanoid();
        const { email, password, ...workerData } = input;
        
        // 1. users 테이블에 로그인 계정 생성
        const userId = nanoid();
        await db.createUser({
          id: userId,
          email,
          password,
          role: "worker",
          name: input.name,
          companyId: ctx.user.companyId,
          pin: "0000",  // PIN 기본값
        });
        
        // 2. workers 테이블에 Worker 등록 (email 포함)
        await db.createWorker({ 
          id, 
          ...workerData,
          email,  // email 추가!
          pinCode: "0000",  // PIN 기본값
          ownerId: ctx.user.id,
          ownerCompanyId: ctx.user.companyId || null // Owner 회사 ID도 함께 저장
        });
        
        return { id, userId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          workerTypeId: z.string().optional(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          password: z.string().min(6).optional(),
          licenseNum: z.string().optional(),
          licenseStatus: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, email, password, ...data } = input;
        
        // 1. workers 테이블 업데이트
        await db.updateWorker(id, { 
          ...data, 
          ...(email && { email }) 
        });
        
        // 2. email이나 password가 변경되면 users 테이블도 업데이트
        if (email || password) {
          // Worker의 email로 users 찾기
          const worker = await db.getWorkerById(id);
          if (worker && worker.email) {
            const user = await db.getUserByEmail(worker.email);
            if (user) {
              const updateData: any = {};
              if (email) updateData.email = email;
              if (password) {
                const { hashPassword } = await import("./_core/password");
                updateData.password = hashPassword(password);
              }
              
              const supabase = db.getSupabase();
              if (supabase) {
                await supabase
                  .from('users')
                  .update(updateData)
                  .eq('id', user.id);
              }
            }
          }
        }
        
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteWorker(input.id);
      return { success: true };
    }),

    // Worker 본인 PIN 번호 변경
    updatePin: protectedProcedure
      .input(z.object({
        pinCode: z.string().length(4, "PIN은 4자리여야 합니다."),
      }))
      .mutation(async ({ input, ctx }) => {
        const supabase = db.getSupabase();
        if (!supabase) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "DB 연결 실패",
          });
        }

        // Worker 레코드 찾기
        const { data: worker, error: findError } = await supabase
          .from("workers")
          .select("id")
          .eq("user_id", ctx.user.id)
          .single();

        if (findError || !worker) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Worker 정보를 찾을 수 없습니다.",
          });
        }

        // PIN 업데이트
        const { error: updateError } = await supabase
          .from("workers")
          .update({ pin_code: input.pinCode })
          .eq("id", worker.id);

        if (updateError) {
          console.error("[Workers] PIN update error:", updateError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "PIN 번호 변경에 실패했습니다.",
          });
        }

        console.log(`[Workers] PIN updated for worker: ${worker.id}`);
        return { success: true };
      }),

    // 인력 + 서류 통합 등록
    createWithDocs: protectedProcedure
      .input(
        z.object({
          workerTypeId: z.string(),
          name: z.string(),
          email: z.string().email(),
          password: z.string().min(6),
          licenseNum: z.string().optional(),
          licenseStatus: z.string().optional(),
          docs: z.array(
            z.object({
              docTypeId: z.string(),
              docName: z.string(),
              fileData: z.string(), // base64 encoded file
              fileName: z.string(),
              mimeType: z.string(),
              issueDate: z.string().optional(),
              expiryDate: z.string().optional(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const workerId = nanoid();
        const { docs, email, password, ...workerData } = input;
        
        // 1. users 테이블에 로그인 계정 생성
        const userId = nanoid();
        await db.createUser({
          id: userId,
          email,
          password,
          role: "worker",
          name: input.name,
          companyId: ctx.user.companyId,
          pin: "0000",  // PIN 기본값
        });
        
        // 2. workers 테이블에 Worker 등록 (email 포함)
        await db.createWorker({ 
          id: workerId, 
          ...workerData,
          email,  // email 추가!
          pinCode: "0000",  // PIN 기본값
          ownerId: ctx.user.id,
          ownerCompanyId: ctx.user.companyId || null // Owner 회사 ID도 함께 저장
        });
        
        // 서류 업로드 및 등록
        if (docs && docs.length > 0) {
          for (const doc of docs) {
            try {
              // base64 디코딩
              const buffer = Buffer.from(doc.fileData, 'base64');
              
              // 파일명을 안전하게 처리 (한글 제거 및 URL-safe)
              const fileExtension = doc.fileName.split('.').pop() || 'file';
              const safeFileName = `${nanoid()}.${fileExtension}`;
              
              // Supabase Storage에 파일 업로드
              const filePath = `worker/${workerId}/${safeFileName}`;
              const { url } = await storagePut(filePath, buffer, doc.mimeType);
              
              // 서류 정보 DB 저장
              const docId = nanoid();
              await db.createDocsCompliance({
                id: docId,
                targetType: "worker",
                targetId: workerId,
                docTypeId: doc.docTypeId,
                docType: doc.docName,
                fileName: doc.fileName,
                fileUrl: url,
                fileSize: buffer.length,
                mimeType: doc.mimeType,
                issueDate: doc.issueDate ? new Date(doc.issueDate) : undefined,
                expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
                uploadedBy: ctx.user.id,
                status: "approved",
              });
              
              console.log(`[Worker] Document uploaded: ${doc.docName} for worker ${workerId}`);
              
              // ============================================================
              // 운전면허증 자동 검증 (RIMS API)
              // 인력유형의 licenseRequired가 true인 경우에만 검증 수행
              // ============================================================
              const isLicenseDoc = doc.docName.includes('운전면허') || doc.docName.includes('면허증');
              if (isLicenseDoc && input.licenseNum) {
                // 인력유형 정보 조회하여 licenseRequired 확인
                const supabase = db.getSupabase();
                if (supabase) {
                  const { data: workerType } = await supabase
                    .from('worker_types')
                    .select('license_required')
                    .eq('id', input.workerTypeId)
                    .single();
                  
                  // licenseRequired가 true인 경우에만 면허 검증 수행
                  if (workerType?.license_required) {
                    console.log(`[Worker] Starting license verification for ${input.name}... (licenseRequired: true)`);
                    
                    try {
                      const { verifyDriverLicense } = await import('./_core/rims-api');
                      
                      // 면허번호는 12자리여야 함 (예: 221212121212)
                      const licenseNo = input.licenseNum.replace(/[^0-9]/g, ''); // 숫자만 추출
                      
                      if (licenseNo.length === 12) {
                        // RIMS API 호출
                        const result = await verifyDriverLicense(
                          licenseNo,
                          input.name,
                          '12' // 기본값: 1종 보통 (추후 개선 시 선택 가능하게)
                        );
                        
                        // 검증 결과 업데이트
                        await supabase
                          .from('docs_compliance')
                          .update({
                            verified: result.isValid,
                            verified_at: new Date().toISOString(),
                            verification_result: result as any,
                            verification_result_code: result.resultCode,
                            verification_error: null,
                          })
                          .eq('id', docId);
                        
                        console.log(`[Worker] License verification completed: ${result.isValid ? 'VALID' : 'INVALID'} (${result.resultCode})`);
                      } else {
                        console.warn(`[Worker] Invalid license number length: ${licenseNo.length} (expected 12)`);
                      }
                    } catch (verifyError: any) {
                      console.error('[Worker] License verification failed:', verifyError.message);
                      
                      // 검증 실패 기록
                      await supabase
                        .from('docs_compliance')
                        .update({
                          verified: false,
                          verified_at: new Date().toISOString(),
                          verification_error: verifyError.message,
                        })
                        .eq('id', docId);
                    }
                  } else {
                    console.log(`[Worker] License verification skipped for ${input.name} (licenseRequired: false)`);
                  }
                }
              }
            } catch (error) {
              console.error("[Worker] Error uploading document:", error);
              throw error;
            }
          }
        }
        
        return { id: workerId };
      }),
  }),

  // ============================================================
  // 서류 관리
  // ============================================================

  docsCompliance: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAllDocsCompliance();
    }),
    listByTarget: protectedProcedure
      .input(
        z.object({
          targetType: z.enum(["equipment", "worker"]),
          targetId: z.string(),
        })
      )
      .query(async ({ input }) => {
        return await db.getDocsComplianceByTarget(input.targetType, input.targetId);
      }),

    getExpiring: protectedProcedure.input(z.object({ daysAhead: z.number().default(30) })).query(async ({ input }) => {
      return await db.getExpiringDocs(input.daysAhead);
    }),

    create: protectedProcedure
      .input(
        z.object({
          targetType: z.enum(["equipment", "worker"]),
          targetId: z.string(),
          docTypeId: z.string(),
          docType: z.string(),
          fileName: z.string().optional(),
          fileUrl: z.string(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
          issueDate: z.string().optional(),
          expiryDate: z.string().optional(),
          status: z.string().default("pending_admin"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = nanoid();
        const expiryDate = input.expiryDate ? new Date(input.expiryDate) : undefined;
        const issueDate = input.issueDate ? new Date(input.issueDate) : undefined;
        await db.createDocsCompliance({
          id,
          ...input,
          issueDate,
          expiryDate,
          uploadedBy: ctx.user.id,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.string().optional(),
          issueDate: z.string().optional(),
          expiryDate: z.string().optional(),
          fileName: z.string().optional(),
          fileUrl: z.string().optional(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, issueDate, expiryDate, ...data } = input;
        const updateData: any = {
          ...data,
        };
        
        if (issueDate) updateData.issueDate = new Date(issueDate);
        if (expiryDate) updateData.expiryDate = new Date(expiryDate);
        
        await db.updateDocsCompliance(id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteDocsCompliance(input.id);
      return { success: true };
    }),

    // 관리자 승인 (1단계)
    adminApprove: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateDocsCompliance(input.id, {
          workflowStage: "admin_approved",
          adminApprovedAt: new Date(),
          adminApprovedBy: ctx.user.id,
          status: "pending_bp",
        });
        return { success: true };
      }),

    // 협력사 승인 (2단계)
    bpApprove: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "bp" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateDocsCompliance(input.id, {
          workflowStage: "bp_approved",
          bpApprovedAt: new Date(),
          bpApprovedBy: ctx.user.id,
          status: "pending_ep",
        });
        return { success: true };
      }),

    // 시행사 승인 (3단계 - 최종)
    epApprove: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "ep" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateDocsCompliance(input.id, {
          workflowStage: "ep_approved",
          epApprovedAt: new Date(),
          epApprovedBy: ctx.user.id,
          status: "approved",
        });
        return { success: true };
      }),

    // 반려
    reject: protectedProcedure
      .input(z.object({ id: z.string(), reason: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateDocsCompliance(input.id, {
          workflowStage: "rejected",
          status: "rejected",
          rejectReason: input.reason,
        });
        return { success: true };
      }),

    // 작업지시서 첨부
    attachWorkOrder: protectedProcedure
      .input(z.object({ id: z.string(), workOrderFileUrl: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateDocsCompliance(input.id, {
          workOrderFileUrl: input.workOrderFileUrl,
          workOrderUploadedAt: new Date(),
        });
        return { success: true };
      }),
  }),

  // ============================================================
  // 안전점검 기록 관리
  // ============================================================

  checkRecords: router({
    listByEquipment: protectedProcedure.input(z.object({ equipmentId: z.string() })).query(async ({ input }) => {
      return await db.getCheckRecordsByEquipment(input.equipmentId);
    }),

    getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
      return await db.getCheckRecordById(input.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          equipmentId: z.string(),
          checklistFormId: z.string(),
          inspectionDate: z.string(),
          resultJson: z.any(),
          status: z.string().default("completed"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = nanoid();
        await db.createCheckRecord({
          id,
          ...input,
          inspectionDate: new Date(input.inspectionDate),
          inspectorId: ctx.user.id,
        });
        return { id };
      }),
  }),

  // ============================================================
  // 작업 확인서 관리 (V2 - Deployment 기반)
  // ============================================================

  workJournal: workJournalRouter,

  // ============================================================
  // 안전점검 시스템
  // ============================================================

  safetyInspection: safetyInspectionRouter,

  // ============================================================
  // 운전자 점검표 시스템
  // ============================================================

  driverInspection: driverInspectionRouter,

  // ============================================================
  // 반입 요청 관리 (Owner → BP → EP) - V2 올바른 프로세스
  // ============================================================

  // 반입 요청 V2 (현재 버전)
  entryRequestsV2: entryRequestsRouterV2,

  // 기존 entryRequests도 V2로 연결 (하위 호환성)
  entryRequests: entryRequestsRouterV2,

  // 기존 버전 (백업)
  entryRequestsOldV1: entryRequestsRouter,

  // 모바일 앱 API
  mobile: mobileRouter,
  deployments: deploymentRouter,

  // PIN 로그인 API
  authPin: authPinRouter,

  // 회사 관리 API
  companies: companiesRouter,

  // 위치 추적 API
  location: locationRouter,

  // 긴급 상황 API
  emergency: emergencyRouter,

  // 작업 구역 관리 API (GPS 기반 출근 체크)
  workZones: workZoneRouter,

  // 출근 체크 API (GPS + 작업 구역 검증)
  checkIn: checkInRouter,

  // WebAuthn 생체 인증 API (지문/얼굴 인식)
  webauthn: webauthnRouter,

  // 기존 entryRequests 라우터 (백업용 - 삭제 예정)
  entryRequestsOld: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllEntryRequests();
    }),

    getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
      return await db.getEntryRequestById(input.id);
    }),

    // BP: 반입 요청
    create: protectedProcedure
      .input(
        z.object({
          equipmentId: z.string(),
          workerId: z.string(),
          purpose: z.string().optional(),
          requestedStartDate: z.string().optional(),
          requestedEndDate: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "bp" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "협력사 권한이 필요합니다." });
        }
        const id = nanoid();
        const requestNumber = `REQ-${Date.now()}`;
        await db.createEntryRequest({
          id,
          requestNumber,
          bpCompanyId: ctx.user.companyId || "",
          bpUserId: ctx.user.id,
          ...input,
          requestedStartDate: input.requestedStartDate ? new Date(input.requestedStartDate) : undefined,
          requestedEndDate: input.requestedEndDate ? new Date(input.requestedEndDate) : undefined,
          status: "bp_requested",
        });
        return { id };
      }),

    // Owner: 서류 체크 후 승인
    ownerApprove: protectedProcedure
      .input(z.object({ id: z.string(), comment: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "장비 운영사 권한이 필요합니다." });
        }
        
        // 반입 요청 정보 조회
        const request = await db.getEntryRequestById(input.id);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
        }
        
        await db.updateEntryRequest(input.id, {
          status: "owner_approved",
          ownerApprovedAt: new Date(),
          ownerApprovedBy: ctx.user.id,
          ownerComment: input.comment,
        });
        
        // 이메일 알림 발송 (BP에게)
        if (request.requestedBy) {
          const requester = await db.getUserById(request.requestedBy);
          if (requester?.email) {
            await sendEntryRequestNotification(
              requester.email,
              "approved",
              request.requestNumber,
              request.equipmentId || "-",
              request.workerId || "-",
              new Date(request.createdAt).toLocaleDateString('ko-KR')
            );
          }
        }
        
        return { success: true };
      }),

    // BP: 작업계획서 첨부 후 승인
    bpApprove: protectedProcedure
      .input(z.object({ id: z.string(), workPlanFileUrl: z.string(), comment: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "bp" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "협력사 권한이 필요합니다." });
        }
        
        // 반입 요청 정보 조회
        const request = await db.getEntryRequestById(input.id);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
        }
        
        await db.updateEntryRequest(input.id, {
          status: "bp_approved",
          bpApprovedAt: new Date(),
          bpApprovedBy: ctx.user.id,
          workPlanFileUrl: input.workPlanFileUrl,
          bpComment: input.comment,
        });
        
        // 이메일 알림 발송 (EP에게)
        // TODO: EP 사용자 목록 조회 후 알림 발송
        
        return { success: true };
      }),

    // EP: 최종 승인
    epApprove: protectedProcedure
      .input(z.object({ id: z.string(), comment: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "ep" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "시행사 권한이 필요합니다." });
        }
        
        // 반입 요청 정보 조회
        const request = await db.getEntryRequestById(input.id);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
        }
        
        await db.updateEntryRequest(input.id, {
          status: "ep_approved",
          epApprovedAt: new Date(),
          epApprovedBy: ctx.user.id,
          epComment: input.comment,
        });
        
        // 이메일 알림 발송 (요청자에게 최종 승인 알림)
        if (request.requestedBy) {
          const requester = await db.getUserById(request.requestedBy);
          if (requester?.email) {
            await sendEntryRequestNotification(
              requester.email,
              "approved",
              request.requestNumber,
              request.equipmentId || "-",
              request.workerId || "-",
              new Date(request.createdAt).toLocaleDateString('ko-KR')
            );
          }
        }
        
        return { success: true };
      }),

    // 반려
    reject: protectedProcedure
      .input(z.object({ id: z.string(), reason: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // 반입 요청 정보 조회
        const request = await db.getEntryRequestById(input.id);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
        }
        
        await db.updateEntryRequest(input.id, {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: ctx.user.id,
          rejectReason: input.reason,
        });
        
        // 이메일 알림 발송 (요청자에게 반려 알림)
        if (request.requestedBy) {
          const requester = await db.getUserById(request.requestedBy);
          if (requester?.email) {
            await sendEntryRequestNotification(
              requester.email,
              "rejected",
              request.requestNumber,
              request.equipmentId || "-",
              request.workerId || "-",
              new Date(request.createdAt).toLocaleDateString('ko-KR'),
              input.reason
            );
          }
        }
        
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await db.deleteEntryRequest(input.id);
      return { success: true };
    }),
  }),

  // ============================================================
  // 긴급 신고 및 위치 추적
  // ============================================================

  emergency: router({
    // 긴급 신고 제출
    report: protectedProcedure
      .input(
        z.object({
          type: z.enum(["accident", "equipment_failure", "safety_hazard", "fire", "other"]),
          description: z.string(),
          location: z.object({
            lat: z.number(),
            lng: z.number(),
            address: z.string().optional(),
          }),
          photos: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const reportId = nanoid();
        const report: EmergencyReport = {
          id: reportId,
          userId: ctx.user.id,
          userName: ctx.user.name || "사용자",
          type: input.type,
          description: input.description,
          location: input.location,
          photos: input.photos,
          timestamp: new Date(),
          status: "reported",
        };

        // TODO: 데이터베이스에 저장
        
        // 이메일 알림 발송
        await sendEmergencyNotification(report);

        return { id: reportId, success: true };
      }),

    // 위치 정보 전송
    trackLocation: protectedProcedure
      .input(
        z.object({
          location: z.object({
            lat: z.number(),
            lng: z.number(),
          }),
          workStatus: z.enum(["working", "resting", "overtime"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const tracking: LocationTracking = {
          userId: ctx.user.id,
          userName: ctx.user.name || "사용자",
          location: input.location,
          timestamp: new Date(),
          workStatus: input.workStatus,
        };

        await saveLocationTracking(tracking);

        return { success: true };
      }),

    // 긴급 신고 목록 조회
    list: protectedProcedure.query(async () => {
      // TODO: 데이터베이스에서 조회
      return [];
    }),

    // 긴급 신고 상태 업데이트
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.enum(["reported", "acknowledged", "responding", "resolved"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // TODO: 데이터베이스 업데이트
        return { success: true };
      }),
  }),

  // ============================================================
  // PDF 생성 및 변환
  // ============================================================

  pdf: router({
    // 단일 이미지를 PDF로 변환
    convertImageToPdf: protectedProcedure
      .input(z.object({ imageUrl: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const pdfBuffer = await imageToPdf(input.imageUrl);

          // Base64로 인코딩하여 반환 (작은 파일용)
          const base64Pdf = pdfBuffer.toString("base64");

          return {
            success: true,
            pdfBase64: base64Pdf,
            mimeType: "application/pdf",
          };
        } catch (error: any) {
          console.error("[PDF] Conversion failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "PDF 변환에 실패했습니다.",
          });
        }
      }),

    // 반입 요청의 모든 서류를 하나의 PDF로 다운로드
    downloadEntryRequestPdf: protectedProcedure
      .input(z.object({ entryRequestId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const supabase = db.getSupabase();
          if (!supabase) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB 연결 실패" });
          }

          // 반입 요청 정보 조회
          const { data: entryRequest, error: reqError } = await supabase
            .from('entry_requests')
            .select('*')
            .eq('id', input.entryRequestId)
            .single();

          if (reqError || !entryRequest) {
            throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
          }

          // 반입 요청 아이템 조회
          const { data: items } = await supabase
            .from('entry_request_items')
            .select('*')
            .eq('entry_request_id', input.entryRequestId);

          if (!items || items.length === 0) {
            throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청 항목이 없습니다." });
          }

          // 장비 ID와 인력 ID 추출
          const equipmentIds = items
            .filter((item: any) => item.item_type === 'equipment')
            .map((item: any) => item.item_id);

          const workerIds = items
            .filter((item: any) => item.item_type === 'worker')
            .map((item: any) => item.item_id);

          // 장비 서류 조회
          const equipmentDocs: any[] = [];
          if (equipmentIds.length > 0) {
            const { data: docs } = await supabase
              .from('docs_compliance')
              .select('*')
              .in('target_id', equipmentIds)
              .eq('target_type', 'equipment');

            if (docs) {
              equipmentDocs.push(
                ...docs.map((d: any) => ({
                  name: d.doc_type || "서류",
                  url: d.file_url,
                  expiryDate: d.expiry_date,
                }))
              );
            }
          }

          // 인력 서류 조회
          const workerDocs: any[] = [];
          if (workerIds.length > 0) {
            const { data: docs } = await supabase
              .from('docs_compliance')
              .select('*')
              .in('target_id', workerIds)
              .eq('target_type', 'worker');

            if (docs) {
              workerDocs.push(
                ...docs.map((d: any) => ({
                  name: d.doc_type || "서류",
                  url: d.file_url,
                  expiryDate: d.expiry_date,
                }))
              );
            }
          }

          // PDF 생성
          const pdfBuffer = await createEntryRequestPdf(
            entryRequest,
            equipmentDocs,
            workerDocs
          );

          // Base64로 인코딩하여 반환
          const base64Pdf = pdfBuffer.toString("base64");

          return {
            success: true,
            pdfBase64: base64Pdf,
            fileName: `반입요청_${entryRequest.request_number || input.entryRequestId}.pdf`,
            mimeType: "application/pdf",
          };
        } catch (error: any) {
          console.error("[PDF] Entry request PDF generation failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "PDF 생성에 실패했습니다.",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

