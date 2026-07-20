import React from "react";
import { useParams } from "react-router-dom";
import { PasswordRegisterForm } from "../components/PasswordRegisterForm";
import styles from "./invite.$token.module.css";

export default function InvitePage() {
  const { token } = useParams();

  return (
    <div className={`dark ${styles.container}`}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img src="/_cdn/static/forgeone-logo.jpg" alt="ForgeOne" className={styles.brandLogo} />
          <p className={styles.subtitle}>Complete your registration</p>
        </div>
        
        <PasswordRegisterForm token={token} />
      </div>
    </div>
  );
}