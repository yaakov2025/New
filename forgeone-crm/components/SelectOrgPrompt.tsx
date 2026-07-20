import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./Button";
import { Building2 } from "lucide-react";
import styles from "./SelectOrgPrompt.module.css";
 
export const SelectOrgPrompt: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <Building2 className={styles.icon} size={48} />
        </div>
        <h2 className={styles.title}>Select an Organization</h2>
        <p className={styles.message}>
          You are not currently associated with any organization. Please select
          or create an organization to continue.
        </p>
        <div className={styles.actions}>
          <Button asChild>
            <Link to="/settings/organizations">View Organizations</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};