import React from "react";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={`dark ${styles.container}`}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img src="/_cdn/static/forgeone-logo.jpg" alt="ForgeOne" className={styles.brandLogo} />
          <p className={styles.subtitle}>Sign in to your account</p>
        </div>
        
        <div className={styles.testCreds}>
          <p><strong>Test Credentials:</strong></p>
          <p>Email: <code>abovegroundroofing@icloud.com</code></p>
          <p>Password: <code>Table-Kilo-Storm-3-Dance</code></p>
        </div>

        <PasswordLoginForm />
      </div>
    </div>
  );
}