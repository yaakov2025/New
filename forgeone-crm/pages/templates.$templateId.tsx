import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TemplateBuilder } from "../components/TemplateBuilder";
import styles from "./templates.$templateId.module.css";

export default function TemplateEditorPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  
  const id = parseInt(templateId || "");

  if (isNaN(id)) {
    return (
      <div className={styles.errorContainer}>
        <h2>Invalid Template ID</h2>
        <p>The requested template could not be found.</p>
        <button className={styles.backButton} onClick={() => navigate("/templates")}>
          Return to Templates
        </button>
      </div>
    );
  }

  return (
    <div className={styles.editorWrapper}>
      <TemplateBuilder 
        templateId={id} 
        onBack={() => navigate("/templates")} 
      />
    </div>
  );
}