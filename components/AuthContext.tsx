"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import IAMService from "@/lib/IAMService";
import { InitCertResponse } from "@/lib/tidecloakApi";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    hasRole: (role: string, clientId?: string) => boolean;
    vuid: string;
    createTxDraft: (txBody: string) => string;
    signTxDraft: (txBody: string, authorizers: string[], ruleSettings: string, expiry: string) => Promise<string>;
    createRuleSettingsDraft: (ruleSettings: string, previousRuleSetting: string, previousRuleSettingCert: string) => string;
    signRuleSettingsDraft: (ruleReq: string, authorizers: string[], ruleSettings: string, expiry: string, initCert: InitCertResponse) => Promise<string>;

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [vuid, setVuid] = useState<string>("");

    useEffect(() => {
        const initAuth = async () => {
            console.log("[DEBUG] Initializing IAM...");
            await IAMService.initIAM(async (authenticated) => {
                setIsAuthenticated(authenticated);
                setIsLoading(false);
            });
            const vuidFromToken = IAMService.getVuid();
            setVuid(vuidFromToken ?? "");
        };
        initAuth();
    }, []);

    const hasRole = (role: string, clientId?: string): boolean => {
        return IAMService.hasRole(role, clientId);
    }

    const createTxDraft = (txBody: string) => {
        return IAMService.createTxDraft(txBody);
    }


    const signTxDraft = (txBody: string, authorizers: string[], ruleSettings: string, expiry: string) => {
        return IAMService.signTxDraft(txBody, authorizers, ruleSettings, expiry);
    }

    const createRuleSettingsDraft = (ruleSettings: string, previousRuleSetting: string, previousRuleSettingCert: string) => {
        return IAMService.createRuleSettingsDraft(ruleSettings, previousRuleSetting, previousRuleSettingCert);
    }


    const signRuleSettingsDraft = (ruleReq: string, authorizers: string[], ruleSettings: string, expiry: string, initCert: InitCertResponse) => {
        return IAMService.signRuleSettingsDraft(ruleReq, authorizers, ruleSettings, expiry, initCert);
    }



    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, hasRole, vuid, createTxDraft, signTxDraft, createRuleSettingsDraft, signRuleSettingsDraft  }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
