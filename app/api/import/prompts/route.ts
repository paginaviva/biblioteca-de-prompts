import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"
import { importV1Schema, importV2Schema } from "../schemas"
import { importV1 } from "../import-v1"
import { importV2 } from "../import-v2"

export async function POST(request: NextRequest) {
  const locale = getLocaleFromRequest(request)
  const t = await getTranslations({ locale, namespace: "Api" })

  try {
    // CRÍTICO: Auth check como PRIMERA operación (seguridad crítica)
    // Ver conocimiento_tecnico_preventivo.md §30
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: t("unauthorized") },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Parsear body
    const body = await request.json()

    // Detectar formato por campo version
    const isV2 = body.version === "2.0"

    let result: { imported: number; upserted: number; created: number }

    if (isV2) {
      // Formato v2.0 con relaciones N:M
      const data = importV2Schema.parse(body)
      result = await importV2(data, userId)
    } else {
      // Formato v1.0 (compatibilidad con imports antiguos)
      const data = importV1Schema.parse(body)
      result = await importV1(data, userId)
    }

    return NextResponse.json({
      success: true,
      imported: {
        prompts: result.imported,
        upserted: result.upserted,
        created: result.created,
      },
      format: isV2 ? "2.0" : "1.0",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t("invalidImportFormat"), details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error importing prompts:", error)
    return NextResponse.json(
      { error: t("failedToImportPrompts") },
      { status: 500 }
    )
  }
}
