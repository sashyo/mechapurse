import { AuthorizerInfoRequest, RealmKeyRules, RuleDefinition, RuleSettings } from "@/interfaces/interface";
import kcData from "../tidecloak.json";
import { ChangeSetRequest, ClientRepresentation, ComponentRepresentation, MappingsRepresentation, RoleRepresentation, UserRepresentation } from "./keycloakTypes";
import { TX_MANAGEMENT_CLIENT } from "../app/constants/client";
import { Roles } from "@/app/constants/roles";

export interface InitCertResponse {
    cert: string;
    sig: string;
}
const KEYCLOAK_AUTH_SERVER = kcData["auth-server-url"];
const REALM = kcData["realm"];

const TC_URL = `${KEYCLOAK_AUTH_SERVER}/admin/realms/${REALM}`;
const REALM_MGMT = "realm-management";
const TX_MGMT = 'TX_MANAGMENT'


export const getTideRealmAdminInitCert = async (token: string): Promise<InitCertResponse> => {
    const client = await getClientByClientId(REALM_MGMT, token)
    if(client === null || client?.id === undefined){
        throw new Error(`Could not get init cert for tide-realm-admin, client ${REALM_MGMT} does not exist`);
    }

    const role = await getClientRoleByName(Roles.Admin, client.id, token);
    return await getRoleInitCert(role.id!, token);
}

export const getRoleInitCert = async (roleId: string, token: string): Promise<InitCertResponse> => {
    const response = await fetch(`${TC_URL}/tideAdminResources/get-init-cert?roleId=${roleId}`, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        }
    });
    return response.json();
};

export const createApprovalURI = async (token: string): Promise<any> => {
    const response = await fetch(`${TC_URL}/tideAdminResources/Create-Approval-URI`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        }
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error creating approval uri: ${response.statusText}`);
        throw new Error(`Error creating approval uri: ${errorBody}`);
    }
    return response.json();
};

export const createAuthorization = async (clientId: string, authorizerApproval: string, authorizerAuthentication: string, token: string): Promise<any> => {
    const formData = new FormData();
    formData.append("authorizerApproval", authorizerApproval);
    formData.append("authorizerAuthentication", authorizerAuthentication);


    const response = await fetch(`${TC_URL}/tideAdminResources/create-authorization?clientId=${clientId}`, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: formData

    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error creating authorization: ${response.statusText}`);
        throw new Error(`Error creating authorization: ${errorBody}`);
    }
    return response.text();
};


export const getTideVendorKeyConfig = async (token: string): Promise<ComponentRepresentation | null> => {
    const response = await fetch(`${TC_URL}/components?name=tide-vendor-key`, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        }
    });
    if (!response.ok) {
        console.error(`Error fetching tide vendor key config: ${response.statusText}`);
        return null;
    }
    const body = await response.json();
    return body[0];
};

export const signMessage = async (message: string, token: string): Promise<string> => {
    const formData = new FormData();
    formData.append("data", message);

    const response = await fetch(`${TC_URL}/vendorResources/sign-message`, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: formData
    });
    return response.text();
};

export const signTx = async (message: string, roleId: string, token: string): Promise<string> => {
    const formData = new FormData();
    formData.append("data", message);

    const response = await fetch(`${TC_URL}/vendorResources/sign-tx?roleId=${roleId}`, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: formData
    });
    return response.text();
};

export const getTransactionRoles = async (token: string): Promise<RoleRepresentation[]> => {
    const client: ClientRepresentation | null = await getClientByClientId(TX_MANAGEMENT_CLIENT, token); // TODO: add to constants 
    if (client === null) {
        return [];
    }
    const response = await fetch(`${TC_URL}/clients/${client.id}/roles`, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        console.error(`Error fetching transaction roles: ${response.statusText}`);
        return [];
    }
    return await response.json();
};

export const getTideRealmAdminRole = async (token: string): Promise<RoleRepresentation> => {
    const client: ClientRepresentation | null = await getClientByClientId(REALM_MGMT, token); // TODO: add to constants 
    if(client === null) throw new Error("No client found with clientId: " + REALM_MGMT);

    const response = await fetch(`${TC_URL}/clients/${client.id}/roles?search=${Roles.Admin}`, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        console.error(`Error fetching tide realm admin role: ${response.statusText}`);
        throw new Error("Error fetching tide realm admin role")
    }

    const roles = await response.json()
    return roles[0];
}; 

export const getRealmKeyRules = async (token: string): Promise<RealmKeyRules> => {
    const tideVendorKeyConfig: ComponentRepresentation | null = await getTideVendorKeyConfig(token);

    if (!tideVendorKeyConfig?.config) {
        return {
            rules: {
                id: "",
                validationSettings: {},
              },
            rulesCert: "",
        };
    }

    const rulesStr: string | undefined = tideVendorKeyConfig.config["rules"]?.[0];
    const rulesCertStr: string = tideVendorKeyConfig.config["rulesCert"]?.[0] ?? "";

    const rules: RuleSettings = rulesStr
        ? JSON.parse(rulesStr)
        : { validationSettings: {} };

    return { rules, rulesCert: rulesCertStr };
};


export const getClientByClientId = async (
    clientId: string,
    token: string
): Promise<ClientRepresentation | null> => {
    try {
        const response = await fetch(`${TC_URL}/clients?clientId=${clientId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            console.error(`Error fetching client by clientId: ${response.statusText}`);
            return null;
        }
        const clients: ClientRepresentation[] = await response.json();
        return clients.length > 0 ? clients[0] : null; // should only be one client in the realm with this clientID
    } catch (error) {
        console.error("Error fetching client by clientId:", error);
        return null;
    }
};

export const getClientById = async (
    id: string,
    token: string
): Promise<ClientRepresentation | null> => {
    try {
        const response = await fetch(`${TC_URL}/clients/${id}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            console.error(`Error fetching client by id: ${response.statusText}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching client by id:", error);
        return null;
    }
};

export const saveAndSignRules = async (ruleDraft: string, expiry: string, authorizations: string[], token: string, newSetting: string): Promise<string> => {
    const formData = new FormData();
    formData.append("ruleDraft", ruleDraft);
    authorizations.forEach(auth => formData.append("authorizations", auth));
    formData.append("expiry", expiry);
    formData.append("newSetting", newSetting);


    
    const response = await fetch(`${TC_URL}/vendorResources/sign-rules`, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: formData
    });
    const res = await response.text();
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error saving and signing rules: ${response.statusText}`);
        throw new Error(`Error saving and signing rules: ${errorBody}`);
    }
    return res;
};

export const createTxMgmtClient = async (token: string): Promise<void> => {
    const clientRep: ClientRepresentation = {
        clientId: TX_MANAGEMENT_CLIENT,
        description: "Client to manage transaction roles"
    };
    const response = await fetch(`${TC_URL}/clients`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(clientRep)
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error creating transaction management client: ${response.statusText}`);
        throw new Error(`Error creating transaction management client: ${errorBody}`);
    }
    return;
};

export const createRoleForClient = async (clientuuid: string, roleRep: RoleRepresentation, token: string): Promise<void> => {
    const response = await fetch(`${TC_URL}/clients/${clientuuid}/roles`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(roleRep)
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error creating role for client: ${response.statusText}`);
        throw new Error(`Error creating role for client: ${errorBody}`);
    }
    return;
};


export const markAsAuthorizerRole = async (roleId: string, token: string): Promise<void> => {
    const response = await fetch(`${TC_URL}/roles-by-id/${roleId}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error fetching role by roleId: ${response.statusText}`);
        throw new Error(`Error fetching role by roleId: ${errorBody}`);
    }
    const roleRep: RoleRepresentation = await response.json();
    roleRep.attributes = {
        ...(roleRep.attributes || {}),
        "isAuthorizerRole": ["true"],
    };

    const test = await fetch(`${TC_URL}/roles-by-id/${roleId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(roleRep)

    });

    return;
};


export const addAuthorizerInfo = async (roleId: string, authInfo: AuthorizerInfoRequest, token: string): Promise<void> => {
    const response = await fetch(`${TC_URL}/tideAdminResources/add-authorizer-info?roleId=${roleId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(authInfo)
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error adding authorizer info: ${response.statusText}`);
        throw new Error(`Error adding authorizer info: ${errorBody}`);
    }
    return;
};

export const getClientRoleByName = async (roleName: string, clientuuid: string, token: string): Promise<RoleRepresentation> => {
    const response = await fetch(`${TC_URL}/clients/${clientuuid}/roles/${roleName}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error fetching client role by name: ${response.statusText}`);
        throw new Error(`Error fetching client role by name: ${errorBody}`);
    }
    return response.json();
};

export const getAdminThreshold = async (token: string): Promise<string> => {
    const realmMgmt = "realm-management";
    const tideRealmAdmin = Roles.Admin;

    const clientResp: ClientRepresentation | null = await getClientByClientId("realm-management", token);
    if(clientResp === null) throw new Error("No client found with clientId: " + realmMgmt);

    const roleRes: RoleRepresentation = await getClientRoleByName(tideRealmAdmin, clientResp.id!, token);

    return roleRes.attributes!["tideThreshold"][0]
}


export const GetUsers = async (token: string): Promise<UserRepresentation[]> => {
    const response = await fetch(`${TC_URL}/users`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        console.error(`Error getting users: ${response.statusText}`);
        return [];
    }
    return await response.json();
};

export const GrantUserRole = async (userId: string,  roleName: string, token: string): Promise<void> => {
    const client = await getClientByClientId(TX_MANAGEMENT_CLIENT, token)
    if(client === null || client?.id === undefined){
        throw new Error(`Could not grant user role, client ${TX_MANAGEMENT_CLIENT} does not exist`);
    }

    const role = await getClientRoleByName(roleName, client.id, token);

    const response = await fetch(`${TC_URL}/users/${userId}/role-mappings/clients/${client.id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(role)
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error adding authorizer info: ${response.statusText}`);
        throw new Error(`Error adding authorizer info: ${errorBody}`);
    }
    return;  
}


export const RemoveUserRole = async (userId: string,  roleName: string, token: string): Promise<void> => {
    const client = await getClientByClientId(TX_MANAGEMENT_CLIENT, token)
    if(client === null || client?.id === undefined){
        throw new Error(`Could not grant user role, client ${TX_MANAGEMENT_CLIENT} does not exist`);
    }

    const role = await getClientRoleByName(roleName, client.id, token);

    const response = await fetch(`${TC_URL}/users/${userId}/role-mappings/clients/${client.id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(role)
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error adding authorizer info: ${response.statusText}`);
        throw new Error(`Error adding authorizer info: ${errorBody}`);
    }
    return;  
}

export const AddUser = async (userRep: UserRepresentation, token: string): Promise<void> => {
    const response = await fetch(`${TC_URL}/users}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userRep)
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error adding authorizer info: ${response.statusText}`);
        throw new Error(`Error adding authorizer info: ${errorBody}`);
    }
    return;  
}

export const GetUserRoleMappings = async (userId: string, token: string): Promise<MappingsRepresentation> => {

    const response = await fetch(`${TC_URL}/users/${userId}/role-mappings`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        console.error(`Error getting user role mappings: ${response.statusText}`);
        return {};
    }
    return await response.json();   
}

export const GetUserChangeRequests = async (token: string): Promise<ChangeSetRequest> => {

    const response = await fetch(`${TC_URL}/tide-admin/change-set/users/requests`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error getting user change requests: ${response.statusText}`);
        throw new Error(`Error getting user change requests: ${errorBody}`);
    }
    return await response.json();   
}