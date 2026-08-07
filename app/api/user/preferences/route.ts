import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"
import {
  parseUIPreferences,
  uiPreferencesShapeSchema,
} from "@/lib/ui-preferences"

const updatePreferencesSchema = z.object({
  promptListViewPreference: z.enum(["cards", "list"]).optional(),
  language: z.enum(["en-GB", "es-ES"]).nullable().optional(),
  uiPreferences: uiPreferencesShapeSchema.optional(),
})

const PROMPT_LIST_VIEW_DEFAULT = "cards" as const

export async function PATCH(request: NextRequest) {
  const locale = getLocaleFromRequest(request)
  const t = await getTranslations({ locale, namespace: "Api" })

  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: t("unauthorized") },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: t("invalidInput") },
        { status: 400 }
      )
    }
    const data = updatePreferencesSchema.parse(body)

    // Merge partial uiPreferences with existing stored value
    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { uiPreferences: true },
    })

    const existingUi = parseUIPreferences(existing?.uiPreferences)
    const uiPreferences = {
      ...existingUi,
      ...(data.uiPreferences ?? {}),
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.promptListViewPreference
          ? { promptListViewPreference: data.promptListViewPreference }
          : {}),
        ...(data.language !== undefined ? { language: data.language } : {}),
        uiPreferences,
      },
      select: {
        promptListViewPreference: true,
        language: true,
        uiPreferences: true,
      },
    })

    return NextResponse.json({ data: user, success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t("invalidInput"), details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating preferences:", error)
    return NextResponse.json(
      { error: t("failedToUpdatePreferences") },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const locale = getLocaleFromRequest(request)
  const t = await getTranslations({ locale, namespace: "Api" })

  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { data: { promptListViewPreference: PROMPT_LIST_VIEW_DEFAULT, language: null, uiPreferences: parseUIPreferences(null) }, success: true }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        promptListViewPreference: true,
        language: true,
        uiPreferences: true,
      },
    })

    return NextResponse.json({ 
      data: { 
        promptListViewPreference: user?.promptListViewPreference || PROMPT_LIST_VIEW_DEFAULT,
        language: user?.language ?? null,
        uiPreferences: parseUIPreferences(user?.uiPreferences),
      },
      success: true,
    })
  } catch (error) {
    console.error("Error fetching preferences:", error)
    return NextResponse.json(
      { error: t("failedToFetchPreferences") },
      { status: 500 }
    )
  }
}
