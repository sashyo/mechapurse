import Heimdall from "tidecloak-js"
import kcData from "../tidecloak.json";
import { getAuthServerUrl, getRealm, getResource } from "./tidecloakConfig";

let _tc: typeof Heimdall | null = null;

function getKeycloakClient(): typeof Heimdall {
    if (!_tc) {
        console.log("[DEBUG] Initializing Heimdall client...");
        _tc = new Heimdall({
            url: getAuthServerUrl(),
            realm: getRealm(),
            clientId: getResource(),
        });

        if (!_tc) {
            console.error("[ERROR] Heimdall client failed to initialize!");
        } else {
            console.log("[DEBUG] Heimdall client initialized:", _tc);
        }
    }
    return _tc;
}


export const updateIAMToken = async (): Promise<void> => {
    const keycloak = getKeycloakClient();

    if (!keycloak) {
        throw new Error("Keycloak is undefined");
    }

    try {
        const refreshed = await keycloak.updateToken(300);
        if (refreshed) {
            const tokenExp = keycloak.tokenParsed?.exp ?? 0;
            const timeSkew = keycloak.timeSkew ?? 0;

            console.debug(
                `[updateIAMToken] Token refreshed: ${Math.round(
                    tokenExp + timeSkew - new Date().getTime() / 1000
                )} seconds`
            );

            if (typeof window !== "undefined") {
                document.cookie = `kcToken=${keycloak.token}; path=/;`;
            }
        } else {
            console.debug("[updateIAMToken] Token was not refreshed.");
        }
    } catch (err) {
        console.error("[updateIAMToken] Failed to refresh token", err);
        throw err;
    }
}

export const initIAM = async (onReadyCallback?: (authenticated: boolean) => void): Promise<void> => {
    try {
        const keycloak = await getKeycloakClient();

        if (typeof window === "undefined") {
            return;
        }

        if (keycloak.didInitialize) {
            if (onReadyCallback) onReadyCallback(keycloak.authenticated ?? false);
            return;
        }


        // Ensure token refresh automatically
        keycloak.onTokenExpired = async () => {
            console.log("[DEBUG] Token expired, attempting refresh...");
            try {
                await updateIAMToken();
                console.log("[DEBUG] Token successfully refreshed.");
            } catch (refreshError) {
                console.error("[ERROR] Failed to refresh token:", refreshError);
            }
        };

        // Run Keycloak initialization
        const authenticated = await keycloak.init({
            onLoad: "check-sso",
            silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
            pkceMethod: "S256",
        });

        console.log("[DEBUG] Keycloak authentication result:", authenticated);

        // Store token if authenticated
        if (authenticated && keycloak.token) {
            document.cookie = `kcToken=${keycloak.token}; path=/; Secure; SameSite=Strict`;
        }
        if (onReadyCallback) onReadyCallback(authenticated);
    } catch (err) {
        console.error("[ERROR] Keycloak initialization failed:", err);
        throw new Error("[ERROR] Keycloak initialization failed:" + err)
    }
};



export const doLogin = (): void => {
    const keycloak = getKeycloakClient();
    keycloak.login({ redirectUri: window.location.origin + "/auth/redirect" });
};

export const doLogout = (): void => {
    const keycloak = getKeycloakClient();
    document.cookie = "kcToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    keycloak.logout({ redirectUri: window.location.origin + "/auth/redirect" });
};

export const isLoggedIn = (): boolean => {
    const keycloak = getKeycloakClient();
    return !!keycloak.token;
};

export const getToken = async (): Promise<string | null> => {
    const keycloak = getKeycloakClient();
    if (keycloak) {
        const tokenExp = getTokenExp();
        if (tokenExp < 3) {
            try {
                await updateIAMToken();
                console.debug("Refreshed the token");
            } catch (error) {
                console.error("Failed to refresh the token", error);
                keycloak.logout();
                return null;
            }
        }
        return keycloak.token ?? null;
    }
    return null;
};

export const getName = (): string | undefined => {
    const keycloak = getKeycloakClient();
    return keycloak.tokenParsed?.preferred_username;
};

export const getTokenExp = (): number => {
    const keycloak = getKeycloakClient();
    if (!keycloak) {
        throw new Error("Keycloak is undefined");
    }
    const tokenExp = keycloak.tokenParsed?.exp ?? 0;
    const timeSkew = keycloak.timeSkew ?? 0;

    return Math.round(
        tokenExp + timeSkew - new Date().getTime() / 1000
    );
};

export const hasOneRole = (role: string): boolean => {
    const keycloak = getKeycloakClient();
    return keycloak.hasRealmRole(role);
};

const IAMService = {
    initIAM,
    doLogin,
    doLogout,
    isLoggedIn,
    getToken,
    getName,
    hasOneRole,
    getTokenExp,
};

export default IAMService;