"use client";

import { useState } from "react";
import styles from "@/styles/AdminDashboard.module.css";
import { UserUpdate } from "@/interfaces/interface";
import { useAuth } from "../AuthContext";

interface User {
  id: string;
  name: string;
  email: string;
  role: string[]; // Ensure role is always a string array.
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface UserUpdateModalProps {
  user: User;
  roles: Role[]; // List of all available roles.
  onClose: () => void;
  onUpdate: (updatedUser: Partial<UserUpdate>) => void | Promise<void>;
}

const UserUpdateModal = ({
  user,
  roles,
  onClose,
  onUpdate,
}: UserUpdateModalProps) => {
  const {vuid} = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  // Save the initial roles for later comparison.
  const initialAssignedRoles: string[] = Array.isArray(user.role)
    ? user.role
    : user.role
      ? [user.role]
      : [];
  const [assignedRoles, setAssignedRoles] = useState<string[]>(initialAssignedRoles);
  const [copyStatus, setCopyStatus] = useState<string>("");

  // Calculate available roles by filtering out roles that are already assigned.
  const availableRoles = roles
    .map((role) => role.name)
    .filter((roleName) => !assignedRoles.includes(roleName));

  // Adds a role from available roles.
  const assignRole = (roleName: string) => {
    setAssignedRoles([...assignedRoles, roleName]);
  };

  // Removes a role from assigned roles.
  const unassignRole = (roleName: string) => {
    setAssignedRoles(assignedRoles.filter((r) => r !== roleName));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Determine which roles to add and which to remove.
    const rolesToAdd = assignedRoles.filter(role => !initialAssignedRoles.includes(role));
    const rolesToRemove = initialAssignedRoles.filter(role => !assignedRoles.includes(role));

    // Pass back updated details along with roles to add and remove, including the original id.
    onUpdate({ id: user.id, name, email, role: assignedRoles, rolesToAdd, rolesToRemove });
  };

  const getTideLinkUrl = async () => {
    const currentUrl = window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);
    const resp = await fetch(`/api/admin/users/tide?userId=${user.id}&redirect_uri=${encodedUrl}`,{
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await resp.json()
    return data.link;

  }

  // Copy link function without URL preview.
  const handleCopyLink = async () => {
    try {
      const linkUrl = await getTideLinkUrl();
      await navigator.clipboard.writeText(linkUrl);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch (error) {
      setCopyStatus("Failed to copy.");
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="userUpdateModalTitle"
    >
      <div className={`${styles.appCard} ${styles.userModalCard}`}>
        <h3 id="userUpdateModalTitle" className={styles.modalTitle}>
          Edit User
        </h3>
        <p className={styles.modalSubtitle}>
          Update user details, manage roles, and invite the user to link their Tide account.
        </p>
        <form onSubmit={handleSubmit}>
          {/* User Details */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Name</label>
            <input
              type="text"
              className={styles.inputField}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.inputField}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Dual-Panel Roles Manager */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Manage Roles</label>
            <div className={styles.rolesContainer}>
              {/* Assigned Roles Panel */}
              <div className={styles.assignedRoles}>
                <h4>Assigned Roles</h4>
                <div className={styles.rolesList}>
                  {assignedRoles.length > 0 ? (
                    <ul className={styles.roleList}>
                      {assignedRoles.map((roleName) => (
                        <li key={roleName} className={styles.roleChip}>
                          {roleName}
                          <button
                            type="button"
                            onClick={() => unassignRole(roleName)}
                            className={styles.removeRoleButton}
                            title="Unassign Role"
                          >
                            &times;
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyState}>No roles assigned.</p>
                  )}
                </div>
              </div>

              {/* Available Roles Panel */}
              <div className={styles.availableRoles}>
                <h4>Available Roles</h4>
                <div className={styles.rolesList}>
                  {availableRoles.length > 0 ? (
                    <ul className={styles.roleList}>
                      {availableRoles.map((roleName) => (
                        <li key={roleName} className={styles.roleChip}>
                          {roleName}
                          <button
                            type="button"
                            onClick={() => assignRole(roleName)}
                            className={styles.addRoleButton}
                            title="Assign Role"
                          >
                            +
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyState}>All roles assigned.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Link Tide Account Section */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Link Tide Account</label>
            <div className={styles.copyLinkContainer}>
              <button
                type="button"
                onClick={handleCopyLink}
                className={styles.copyLinkButton}
              >
                Copy Tide Link
              </button>
              {copyStatus && <span className={styles.copyToast}>{copyStatus}</span>}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.secondaryButton}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserUpdateModal;
