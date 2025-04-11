import { NextRequest, NextResponse } from "next/server";
import { createApprovalURI, getAdminThreshold, getRealmKeyRules, getTransactionRoles, getUserByVuid, saveAndSignRules } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { RoleRepresentation } from "@/lib/keycloakTypes";
import { RuleDefinition, RuleSettingDraft, RuleSettings } from "@/interfaces/interface";
import { AddRuleConfiguration, DeleteRuleSettingsDraft, GetRuleSettingsDraft, GetRuleSettingsDraftById } from "@/lib/db";
import { base64ToBytes, bytesToBase64, getHumanReadableObject } from "tidecloak-js";

const allowedRole = [Roles.Admin];

export async function POST(req: NextRequest) {
    try {
        let body;
        try {
            const text = await req.text();
            body = text ? JSON.parse(text) : null;
        } catch (err) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const { id } = body;

        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await verifyTideCloakToken(token, allowedRole);
        if (!user) throw new Error("Invalid token");


        await DeleteRuleSettingsDraft(id)

        return NextResponse.json({ message: "Successfully deleted" });

    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }

}

