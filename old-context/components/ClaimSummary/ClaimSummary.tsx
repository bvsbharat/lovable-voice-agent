import React, { useState } from "react";
import { ClaimData } from "src/config/aiAgent";
import {
  mapIncidentToLossCause,
  getLossCauseName,
  LossCauseType,
} from "src/services/claimCreation";

import styles from "./ClaimSummary.module.scss";

interface ClaimSummaryProps {
  claimData: ClaimData;
  isComplete: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  submitStatus: "idle" | "submitting" | "success" | "error";
  children?: React.ReactNode;
  onLossCauseChange?: (lossCause: LossCauseType) => void;
}

export const ClaimSummary = ({
  claimData,
  isComplete,
  onSubmit,
  submitStatus,
  children,
  onLossCauseChange,
}: ClaimSummaryProps) => {
  const [isEditingLossCause, setIsEditingLossCause] = useState(false);

  const lossCauseOptions: LossCauseType[] = [
    "bikecollision",
    "leftcollision",
    "fixedobjcoll",
    "vehcollision",
    "pedcollision",
    "trainbuscoll",
    "rearend",
    "animal",
    "rollover",
    "theftparts",
    "theftentire",
    "vandalism",
    "riotandcivil",
    "FallingObject",
    "fire",
    "loadingdamage",
  ];

  const getButtonText = () => {
    switch (submitStatus) {
      case "submitting":
        return "Submitting claim...";
      case "error":
        return "Try Again";
      default:
        return "Submit Claim";
    }
  };

  const handleLossCauseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLossCause = e.target.value as LossCauseType;

    onLossCauseChange?.(newLossCause);
    setIsEditingLossCause(false);
  };

  return (
    <div className={styles.claimSummary}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 className={styles.title}>Claim Summary</h2>
        {children && <div className={styles.avatarContainer}>{children}</div>}
      </div>
      <div className={styles.summarySection}>
        <h3>Incident Details</h3>
        <div className={styles.summaryRow}>
          <span className={styles.label}>Date & Time</span>
          <span className={styles.value}>
            {claimData?.incidentDate ? (
              new Date(claimData.incidentDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            ) : (
              <span className={styles.naValue}>Not Provided</span>
            )}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.label}>Location</span>
          <span className={styles.value}>
            {claimData.incidentLocation ? (
              <>
                <div>📍 {claimData.incidentLocation.addressLine1}</div>
                <div>
                  {claimData.incidentLocation.city},{" "}
                  {claimData.incidentLocation.state.code}{" "}
                  {claimData.incidentLocation.postalCode}
                </div>
                <div>{claimData.incidentLocation.country}</div>
              </>
            ) : (
              <span className={styles.naValue}>Not Provided</span>
            )}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.label}>Description</span>
          <span className={styles.value}>
            {claimData.incidentDescription ? (
              claimData.incidentDescription
            ) : (
              <span className={styles.naValue}>Not Provided</span>
            )}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.label}>Damage Details</span>
          <span className={styles.value}>
            {claimData.damageDescription ? (
              claimData.damageDescription
            ) : (
              <span className={styles.naValue}>Not Provided</span>
            )}
          </span>
        </div>

        <div className={styles.summaryRow}>
          <span className={styles.label}>Loss cause</span>
          <span className={styles.value}>
            {claimData.incidentDescription ? (
              isEditingLossCause ? (
                <select
                  value={
                    claimData.lossCause?.code ||
                    mapIncidentToLossCause(claimData.incidentDescription)
                  }
                  onChange={handleLossCauseChange}
                  className={styles.lossCauseSelect}
                >
                  {lossCauseOptions.map((option) => (
                    <option key={option} value={option}>
                      {getLossCauseName(option)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={styles.lossCauseContainer}>
                  <span>
                    {claimData.lossCause?.name ||
                      getLossCauseName(
                        mapIncidentToLossCause(claimData.incidentDescription)
                      )}
                  </span>
                  <button
                    className={styles.editButton}
                    onClick={() => setIsEditingLossCause(true)}
                    title="Edit loss cause"
                  >
                    ✏️
                  </button>
                </div>
              )
            ) : (
              <span className={styles.naValue}>Not Provided</span>
            )}
          </span>
        </div>

        <div className={styles.summaryRow}>
          <span className={styles.label}>Vehicle</span>
          <span className={styles.value}>
            {claimData.vehicleMakeAndModel ? (
              <>
                {claimData.vehicleMakeAndModel.year}{" "}
                {claimData.vehicleMakeAndModel.make}{" "}
                {claimData.vehicleMakeAndModel.model}
              </>
            ) : (
              <span className={styles.naValue}>Not Provided</span>
            )}
          </span>
        </div>
      </div>

      <div className={styles.summarySection}>
        <h3>Claimant Information</h3>
        <div className={styles.summaryRow}>
          <span className={styles.label}>Name</span>
          <span className={styles.value}>
            {claimData.claimantInfo?.name ? (
              claimData.claimantInfo.name
            ) : (
              <span className={styles.naValue}>Not Provided</span>
            )}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.label}>Contact</span>
          <span className={styles.value}>
            {claimData.claimantInfo?.contact ? (
              typeof claimData.claimantInfo.contact === "object" &&
              "type" in claimData.claimantInfo.contact ? (
                <>
                  {claimData.claimantInfo.contact.type === "email" ? (
                    <span>📧 {claimData.claimantInfo.contact.value}</span>
                  ) : (
                    <span>📱 {claimData.claimantInfo.contact.value}</span>
                  )}
                </>
              ) : (
                claimData.claimantInfo.contact
              )
            ) : (
              <span className={styles.naValue}>Not Provided</span>
            )}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.label}>Policy Number</span>
          <span className={styles.value}>
            {claimData.claimantInfo?.policyNumber ? (
              claimData.claimantInfo.policyNumber
            ) : (
              <span className={styles.naValue}>Not Provided</span>
            )}
          </span>
        </div>
      </div>

      <div className={styles.buttonContainer}>
        <button
          className={styles.submitButton}
          onClick={onSubmit}
          disabled={!isComplete || submitStatus === "submitting"}
          type="button"
        >
          {submitStatus === "submitting" ? (
            <>
              <div className={styles.spinner} />
              {getButtonText()}
            </>
          ) : (
            <>
              {getButtonText()}
              {submitStatus !== "error" && (
                <span style={{ marginLeft: "8px" }}>→</span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
