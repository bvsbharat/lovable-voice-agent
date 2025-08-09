import React, { Children, useEffect, useState } from "react";
import { ClaimData } from "src/config/aiAgent";
import styles from "./ClaimProgress.module.scss";

interface ClaimProgressProps {
  claimData: ClaimData;
  onComplete?: () => void;
  onStop?: () => void;
}

type ClaimField = keyof ClaimData;
type ClaimantInfoField = keyof NonNullable<ClaimData["claimantInfo"]>;

export const ClaimProgress = ({
  claimData,
  onComplete,
  onStop,
}: // children,
ClaimProgressProps) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  const calculateProgress = () => {
    const requiredFields: (ClaimField | `claimantInfo.${ClaimantInfoField}`)[] =
      [
        "incidentDate",
        "incidentLocation",
        "incidentDescription",
        "damageDescription",
        "claimantInfo.name",
        "claimantInfo.contact",
        "claimantInfo.policyNumber",
        "vehicleMakeAndModel",
        "lossCause",
      ];

    let filledCount = 0;
    requiredFields.forEach((field) => {
      if (typeof field === "string" && field.includes(".")) {
        const [parent, child] = field.split(".") as [
          "claimantInfo",
          ClaimantInfoField
        ];
        if (claimData[parent]?.[child]) filledCount++;
      } else {
        const simpleField = field as ClaimField;
        if (simpleField === "incidentLocation") {
          // Check if all required location fields are present
          const location = claimData.incidentLocation;
          if (
            location?.addressLine1 &&
            location.city &&
            location.postalCode &&
            location.country &&
            location.state?.code &&
            location.state?.name
          ) {
            filledCount++;
          }
        } else if (claimData[simpleField]) {
          filledCount++;
        }
      }
    });

    return Math.min(
      Math.round((filledCount / requiredFields.length) * 100),
      100
    );
  };

  const progress = calculateProgress();

  useEffect(() => {
    const animateProgress = () => {
      const step = Math.ceil((progress - displayProgress) / 10);
      if (displayProgress < progress) {
        setDisplayProgress((prev) => Math.min(prev + step, progress));
      }
    };

    const timer = setInterval(animateProgress, 50);
    return () => clearInterval(timer);
  }, [progress, displayProgress]);

  useEffect(() => {
    if (progress === 100 && onComplete) {
      onComplete();
    }
  }, [progress, onComplete]);

  return (
    <React.Fragment>
      <div className={styles.claimProgressContainer}>
        <div className={styles.claimProgressCard}>
          <h2>Claim Progress</h2>
          <div className={styles.progressValue}>{displayProgress}%</div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <button className={styles.closeButton} onClick={onStop}>
            End Call
          </button>
        </div>
      </div>
    </React.Fragment>
  );
};
