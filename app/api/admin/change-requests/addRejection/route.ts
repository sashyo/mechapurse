import { NextRequest, NextResponse } from "next/server";
import { AddRejection, createApprovalURI, getAdminThreshold, getRealmKeyRules, getTransactionRoles, GetUserChangeRequests, saveAndSignRules, SignChangeSetRequest } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { RoleRepresentation } from "@/lib/keycloakTypes";
import { RuleDefinition, RuleSettings } from "@/interfaces/interface";
import { AddRuleConfiguration, GetRuleSettingsAuthorizationById, GetRuleSettingsDraft } from "@/lib/db";
import { base64ToBytes, bytesToBase64, getHumanReadableObject } from "tidecloak-js";

const allowedRole = [Roles.Admin];

export async function POST(req: NextRequest) {
    try {
        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await verifyTideCloakToken(token, allowedRole);
        if (!user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }
        const { changeRequest } = await req.json()

        const response = await AddRejection(changeRequest, token);

        return NextResponse.json({
            message:
                "Successfully added rejection information to change request"
        });

    } catch (error) {
        console.error("Error adding rejection information to change request:", error);
        return NextResponse.json({ error: "Error adding rejection information to change request:" }, { status: 500 });
    }
}
