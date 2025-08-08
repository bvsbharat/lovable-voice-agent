import React, { useState, useRef, useEffect, useCallback } from "react";
import cn from "classnames";

import { VoiceAvatar } from "src/components/VoiceAvatar/VoiceAvatar";
import { useAuth } from "@jutro/auth";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { WavRecorder, WavStreamPlayer } from "src/lib/wavtools/index.js";
import { WavRenderer } from "src/utils/wav_renderer";
import { setInstructions, ClaimData } from "src/config/aiAgent";
import { Policy } from "src/generated/PcSdk/policy/types";
import {
  createAndSubmitClaim,
  mapIncidentToLossCause,
  LossCauseType,
  getLossCauseName,
  createDraftClaim,
} from "src/services/claimCreation";

import { VehicleService } from "src/services/VehicleService";
import { fetchPolicies } from "src/hooks/policyHelper";
import { VehicleResponseType as Vehicle } from "src/types/vehicle";

import { ClaimSummary, SuccessModal, ClaimProgress } from "src/components";

// import microphone from '../../assets/images/microphone.svg';

import styles from "./FileClaim.module.scss";

const LOCAL_RELAY_SERVER_URL =
  process.env.REACT_APP_LOCAL_RELAY_SERVER_URL || "";
const API_KEY = process.env.REACT_APP_OPENAI_API_KEY || "";

/**
 * Interface for audio activity state tracking both user and AI speech
 */
interface AudioActivity {
  userSpeaking: boolean;
  aiSpeaking: boolean;
}

/**
 * Interface for realtime events from the conversation
 */
interface RealtimeEvent {
  time: string;
  source: "client" | "server";
  count?: number;
  event: { [key: string]: any };
}

/**
 * FileClaim Component
 *
 * A voice-enabled claim filing interface that uses AI to guide users through the claim process.
 * Handles real-time audio streaming, voice recognition, and AI responses.
 */
export const FileClaim: React.FC = () => {
  // Connection and conversation state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Initialize claim data with default customer information
  const [claimData, setClaimData] = useState<ClaimData>({
    claimantInfo: {},
  });

  const [isComplete, setIsComplete] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [claimId, setClaimId] = useState("");
  const [draftClaimId, setDraftClaimId] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [policyList, setPolicyList] = useState<Policy[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  // Audio state
  const [audioActivity, setAudioActivity] = useState<AudioActivity>({
    userSpeaking: false,
    aiSpeaking: false,
  });

  // Submit status
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserActivityRef = useRef<number>(Date.now());
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null);

  // Audio processing refs
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );

  const GATEWAY_BASE_URL = "wss://marvin.dev.ccs.guidewire.net/genai/openai";
  const TENANT = "xapps";
  const STAR = "claims";
  let { accessToken } = useAuth();
  const GATEWAY_URL = `${GATEWAY_BASE_URL}/v1/${TENANT}/${STAR}/realtime/ws?model=gpt-4o-realtime-preview-2025-06-03&test=""`;
  accessToken = accessToken || "";

  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      GATEWAY_URL
        ? {
            url: GATEWAY_URL,
            apiKey: accessToken,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
        : { apiKey: accessToken, dangerouslyAllowAPIKeyInBrowser: true }
    )
  );

  // Visualization refs
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  // Add claimDataRef to track latest state
  const claimDataRef = useRef(claimData);

  const getPolicies = useCallback(async () => {
    const list = await fetchPolicies();

    if (JSON.stringify(list) !== JSON.stringify(policyList)) {
      setPolicyList(list);
    }

    const policyNumbers = list?.map((p) => p.id) ?? [];

    if (policyNumbers.length > 0) {
      const response = await VehicleService.getVehiclesByPolicies(
        policyNumbers[0] as string // TO-DO logic to ask user to confirm policy from user
      );

      setVehicles(response);
    }
  }, [policyList]);

  useEffect(() => {
    getPolicies();
  }, []);

  useEffect(() => {
    claimDataRef.current = claimData;
    console.log("claimData", claimData);
  }, [claimData]);

  /**
   * Initializes and connects the conversation with AI
   * Sets up audio recording, playback, and event handlers
   */
  const connectConversation = useCallback(async () => {
    // Prevent multiple connection attempts
    if (isConnecting || isConnected) {
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError(null);

      if (!LOCAL_RELAY_SERVER_URL && !API_KEY) {
        throw new Error(
          "Neither LOCAL_RELAY_SERVER_URL nor API_KEY is configured"
        );
      }

      const client = clientRef.current;
      const wavRecorder = wavRecorderRef.current;
      const wavPlayer = wavPlayerRef.current;

      startTimeRef.current = new Date().toISOString();

      // Connect audio components first
      try {
        await wavRecorder.begin();
        await wavPlayer.connect();
      } catch (error) {
        console.error("Failed to initialize audio components:", error);
        setConnectionError(
          "Failed to initialize audio. Please check your microphone permissions."
        );
        throw new Error(
          "Failed to initialize audio. Please check your microphone permissions."
        );
      }

      // Then attempt RealtimeAPI connection
      try {
        await client.connect();
        setIsConnected(true);
      } catch (error) {
        console.error("Failed to connect to RealtimeAPI:", error);
        // Cleanup audio components if RealtimeAPI connection fails
        if (wavRecorder.recording) {
          wavRecorder.stream?.getTracks().forEach((track) => track.stop());
        }
        if (wavPlayer.context) {
          await wavPlayer.context.close();
        }
        setConnectionError(
          "Failed to connect to AI service. Please check your internet connection and try again."
        );
        throw new Error(
          "Failed to connect to AI service. Please check your internet connection and try again."
        );
      }

      // Handle AI interruption
      client.on("conversation.interrupted", async () => {
        const trackSampleOffset = await wavPlayer.interrupt();

        if (trackSampleOffset?.trackId && trackSampleOffset?.offset > 70000) {
          await client.cancelResponse(
            trackSampleOffset.trackId,
            trackSampleOffset.offset
          );
        }
      });

      // Send initial greeting
      client.sendUserMessageContent([{ type: "input_text", text: "Hi" }]);

      if (client.getTurnDetectionType() === "server_vad") {
        await wavRecorder.record((data) => client.appendInputAudio(data.mono));
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected]);

  /**
   * Disconnects the conversation and resets state
   */
  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setIsPreview(false);
    setShowSuccessModal(false);
    setClaimData({
      claimantInfo: {},
    });
    setAudioActivity({
      userSpeaking: false,
      aiSpeaking: false,
    });

    // Clear idle timer and countdown
    if (idleTimerRef.current) {
      clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setIdleCountdown(null);

    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavPlayer = wavPlayerRef.current;

    client.disconnect();
    await wavRecorder.end();
    await wavPlayer.interrupt();
  }, []);

  useEffect(() => {
    const client = clientRef.current;
    const wavPlayer = wavPlayerRef.current;

    if (!vehicles) {
      return;
    }

    // Set up client configuration with auto mode by default
    client.updateSession({
      instructions: setInstructions(
        vehicles,
        policyList[0]?.policyNumber || ""
      ),
      input_audio_transcription: { model: "whisper-1" },
      turn_detection: {
        type: "server_vad",
        silence_duration_ms: 1000,
        threshold: 0.9,
      },
      temperature: 0.7,
      voice: "coral",
    });

    // Add tool for collecting claim data
    client.addTool(
      {
        name: "update_claim_data",
        description: "Updates the claim information with new data",
        parameters: {
          type: "object",
          properties: {
            field: {
              type: "string",
              enum: [
                "incidentDate",
                "incidentLocation",
                "incidentDescription",
                "damageDescription",
                "claimantInfo",
                "lossCause",
                "vehicleMakeAndModel",
              ],
              description: "Field to update",
            },
            value: {
              oneOf: [
                {
                  type: "string",
                  description: "New value for string fields",
                },
                {
                  type: "object",
                  description: "Vehicle information",
                  properties: {
                    type: { type: "string" },
                    make: { type: "string" },
                    model: { type: "string" },
                    year: { type: "string" },
                    vin: { type: "string" },
                  },
                  required: ["type", "make", "model"],
                },
                {
                  type: "object",
                  description: "Contact information",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["email", "phone"],
                    },
                    value: { type: "string" },
                  },
                  required: ["type", "value"],
                },
                {
                  type: "object",
                  description: "Location information",
                  properties: {
                    addressLine1: { type: "string" },
                    city: { type: "string" },
                    postalCode: { type: "string" },
                    country: { type: "string" },
                    state: {
                      type: "object",
                      properties: {
                        code: { type: "string" },
                        name: { type: "string" },
                      },
                      required: ["code", "name"],
                    },
                  },
                  required: [
                    "addressLine1",
                    "city",
                    "postalCode",
                    "country",
                    "state",
                  ],
                },
              ],
              description: "New value",
            },
            subField: {
              type: "string",
              enum: ["name", "contact", "policyNumber", "code"],
              description: "Sub-field for claimantInfo or lossCause",
            },
          },
          required: ["field", "value"],
        },
      },
      async ({
        field,
        value,
        subField,
      }: {
        field: string;
        value:
          | string
          | {
              type: string;
              make: string;
              model: string;
              year?: string;
              vin?: string;
            }
          | {
              type: "email" | "phone";
              value: string;
            }
          | {
              addressLine1: string;
              city: string;
              postalCode: string;
              country: string;
              state: {
                code: string;
                name: string;
              };
            };
        subField?: string;
      }) => {
        setClaimData((prev) => {
          const name = "Ray Newton";
          const policyNumber = policyList[0]?.policyNumber || "P000143542";
          let newData = {
            ...prev,
          };

          if (field === "claimantInfo" && subField) {
            if (
              subField === "contact" &&
              typeof value === "object" &&
              "type" in value &&
              "value" in value
            ) {
              // Validate contact information
              const contactValue = value as {
                type: "email" | "phone";
                value: string;
              };

              if (contactValue.type === "email") {
                if (!contactValue.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                  return prev;
                }
              } else if (contactValue.type === "phone") {
                if (!contactValue.value.match(/^\+[1-9]\d{1,14}$/)) {
                  return prev;
                }
              }

              newData = {
                ...prev,
                claimantInfo: {
                  name: prev.claimantInfo?.name || name,
                  policyNumber: prev.claimantInfo?.policyNumber || policyNumber,
                  ...prev.claimantInfo,
                  [subField]: contactValue,
                },
              };
            } else {
              newData = {
                ...prev,
                claimantInfo: {
                  name: prev.claimantInfo?.name || name,
                  policyNumber: prev.claimantInfo?.policyNumber || policyNumber,
                  ...prev.claimantInfo,
                  [subField]: value as string,
                },
              };
            }
          } else if (field === "incidentLocation") {
            if (typeof value === "object" && "addressLine1" in value) {
              const locationValue = value as {
                addressLine1: string;
                city: string;
                postalCode: string;
                country: string;
                state: {
                  code: string;
                  name: string;
                };
              };
              // Basic validation for required fields

              if (
                !locationValue.addressLine1 ||
                !locationValue.city ||
                !locationValue.postalCode ||
                !locationValue.country ||
                !locationValue.state.code ||
                !locationValue.state.name
              ) {
                return prev;
              }

              newData = {
                ...prev,
                claimantInfo: {
                  name: prev.claimantInfo?.name || name,
                  policyNumber: prev.claimantInfo?.policyNumber || policyNumber,
                  ...prev.claimantInfo,
                },
                incidentLocation: locationValue,
              };
            }
          } else if (field === "incidentDescription") {
            const description = value as string;

            newData = {
              ...prev,
              claimantInfo: {
                name: prev.claimantInfo?.name || name,
                policyNumber: prev.claimantInfo?.policyNumber || policyNumber,
                ...prev.claimantInfo,
              },
              incidentDescription: description,
              lossCause: {
                code: mapIncidentToLossCause(description),
                name: getLossCauseName(mapIncidentToLossCause(description)),
              },
            };
          } else if (field === "lossCause" && subField === "code") {
            newData = {
              ...prev,
              claimantInfo: {
                name: prev.claimantInfo?.name || "",
                policyNumber: prev.claimantInfo?.policyNumber || "",
                ...prev.claimantInfo,
              },
              lossCause: {
                ...prev.lossCause,
                code: value as LossCauseType,
                name: getLossCauseName(value as LossCauseType),
              },
            };
          } else if (field === "vehicleMakeAndModel") {
            if (typeof value === "object" && "make" in value) {
              newData = {
                ...prev,
                claimantInfo: {
                  name: prev.claimantInfo?.name || name,
                  policyNumber: prev.claimantInfo?.policyNumber || policyNumber,
                  ...prev.claimantInfo,
                },
                vehicleMakeAndModel: value,
              };
            }
          } else if (field === "incidentDate" && typeof value === "string") {
            newData = {
              ...prev,
              incidentDate: value,
            };
          } else {
            if (typeof value === "string") {
              newData = {
                ...prev,
                claimantInfo: {
                  name: prev.claimantInfo?.name || name,
                  policyNumber: prev.claimantInfo?.policyNumber || policyNumber,
                  ...prev.claimantInfo,
                },
                [field]: value,
              };
            }
          }

          return newData;
        });

        return { success: true };
      }
    );

    // Add tool for showing preview
    client.addTool(
      {
        name: "show_claim_preview",
        description: "Shows the claim summary for user confirmation",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      async () => {
        setIsPreview(true);

        return { success: true };
      }
    );

    // Add a new tool for AI to mark the form as complete
    client.addTool(
      {
        name: "mark_claim_complete",
        description:
          "Mark the claim form as complete when all required information is collected and confirmed with the user",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      async () => {
        setIsComplete(true);

        return { success: true };
      }
    );

    // Add tool for submitting claim to AssistNet
    client.addTool(
      {
        name: "submit_claim_to_assistnet",
        description:
          "Submit the completed claim to AssistNet when user confirms submission",
        parameters: {
          type: "object",
          properties: {
            confirmationMessage: {
              type: "string",
              description: "Message to confirm successful submission",
            },
          },
          required: ["confirmationMessage"],
        },
      },
      async (params: { confirmationMessage: string }) => {
        try {
          if (submitStatus === "submitting") return;

          setSubmitStatus("submitting");

          // Get the latest claim data from the ref
          const latestClaimData = claimDataRef.current;
          const { claimNumber } = await createAndSubmitClaim(
            latestClaimData,
            vehicles,
            draftClaimId
          );

          setClaimId(claimNumber);
          setShowSuccessModal(true);

          return {
            success: true,
            message: params.confirmationMessage + "Claim ID : " + claimNumber,
            claimNumber,
          };
        } catch (error) {
          setSubmitStatus("error");

          return {
            success: false,
            error: "Failed to submit claim to AssistNet",
          };
        }
      }
    );

    // Add tool to end the call if user doesn't want to submit a claim
    client.addTool(
      {
        name: "stop_call_to_assistnet",
        description: "End the call if user does not want to file a claim",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for ending the call",
            },
            saveToDraft: {
              type: "boolean",
              description: "Whether to save information to a draft claim",
            },
          },
          required: ["reason"],
        },
      },
      async (params: { reason: string; saveToDraft?: boolean }) => {
        try {
          // Get the latest claim data
          const latestClaimData = claimDataRef.current;

          // If user wants to save to draft and we have incident date but no draft claim yet
          if (
            params.saveToDraft &&
            latestClaimData.incidentDate &&
            !draftClaimId
          ) {
            await createDraftClaimIfNeeded(latestClaimData.incidentDate);
          }

          // Update claim data with end reason and draft claim id
          setClaimData((prev) => ({
            ...prev,
            callEnded: true,
            endReason: params.reason,
            draftClaimId: draftClaimId || prev.draftClaimId,
          }));

          // Console log the draft claim information
          console.log("Ending call with draft claim information:", {
            draftClaimId,
            saveToDraft: params.saveToDraft,
            claimData: latestClaimData,
          });

          // Wait briefly to ensure the message is processed before disconnecting
          setTimeout(() => {
            disconnectConversation();
          }, 15000);

          return {
            success: true,
            message:
              "Call ended: " +
              params.reason +
              (draftClaimId ? " (Draft claim saved)" : ""),
            draftClaimId: draftClaimId || undefined,
          };
        } catch (error) {
          console.error("Error ending call:", error);
          return {
            success: false,
            error: "Failed to end call properly",
          };
        }
      }
    );

    // Handle events
    client.on("conversation.updated", async ({ item, delta }: any) => {
      if (delta?.audio) {
        setAudioActivity((prev) => ({
          ...prev,
          aiSpeaking: true,
        }));
        wavPlayer.add16BitPCM(delta.audio, item.id);
      }

      if (item.role === "assistant" && item.formatted.text) {
        // setCurrentMessage(item.formatted.text);
      }

      // if (item.status === 'completed') {
      //     setAudioActivity(prev => ({
      //         ...prev,
      //         aiSpeaking: false,
      //     }));
      // }
    });

    return () => {
      client.reset();
    };
  }, [vehicles]);

  useEffect(() => {
    if (submitStatus === "success") {
      disconnectConversation();
    }
  }, [submitStatus]);

  // Monitor user activity and show countdown timer when idle
  useEffect(() => {
    // Only set up the idle timer when connected
    if (!isConnected) {
      // Clean up any existing timer
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      setIdleCountdown(null);
      return;
    }

    const IDLE_WARNING_THRESHOLD = 35; // seconds before showing warning
    const IDLE_DISCONNECT_THRESHOLD = 45; // seconds before disconnecting

    // Reset user activity when connection starts or this effect runs
    lastUserActivityRef.current = Date.now();

    const checkUserActivity = () => {
      // Skip if not connected
      if (!isConnected) return;

      const currentTime = Date.now();
      const idleTime = Math.floor(
        (currentTime - lastUserActivityRef.current) / 1000
      );

      // If AI is speaking, reset the timer
      if (audioActivity.aiSpeaking) {
        lastUserActivityRef.current = Date.now();
        setIdleCountdown(null);
        return;
      }

      // When in listening mode (AI not speaking)
      if (
        idleTime >= IDLE_WARNING_THRESHOLD &&
        idleTime < IDLE_DISCONNECT_THRESHOLD
      ) {
        // Show countdown timer
        const remainingSeconds = IDLE_DISCONNECT_THRESHOLD - idleTime;
        setIdleCountdown(remainingSeconds);
      } else if (idleTime >= IDLE_DISCONNECT_THRESHOLD) {
        // Disconnect after idle threshold is reached
        disconnectConversation();
      } else {
        // Reset countdown if user is active
        setIdleCountdown(null);
      }
    };

    // Clear any existing idle timer before setting a new one
    if (idleTimerRef.current) {
      clearInterval(idleTimerRef.current);
    }

    // Set up new interval to check for user activity
    idleTimerRef.current = setInterval(checkUserActivity, 1000);

    // Run an initial check
    checkUserActivity();

    // Cleanup function
    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [isConnected, audioActivity.aiSpeaking, disconnectConversation]);

  // Update activity timestamp when user is speaking
  useEffect(() => {
    if (audioActivity.userSpeaking && isConnected) {
      lastUserActivityRef.current = Date.now();
      setIdleCountdown(null);
    }
  }, [audioActivity.userSpeaking, isConnected]);

  // // Set up call timeout (5 minutes max call duration)
  // useEffect(() => {
  //     if (isConnected) {
  //         // Set timeout to end call after 5 minutes (300,000 milliseconds)
  //         callTimeoutRef.current = setTimeout(
  //             () => {
  //                 console.log(
  //                     'Call timeout reached (5 minutes), ending call'
  //                 );
  //                 // Automatically end the call
  //                 disconnectConversation();
  //             },
  //             4 * 60 * 1000
  //         );

  //         console.log('Call timeout set for 5 minutes');
  //     }

  //     // Cleanup timeout if component unmounts or call ends
  //     return () => {
  //         if (callTimeoutRef.current) {
  //             clearTimeout(callTimeoutRef.current);
  //         }

  //         if (idleTimerRef.current) {
  //             clearInterval(idleTimerRef.current);
  //             idleTimerRef.current = null;
  //         }

  //         setIdleCountdown(null);
  //     };
  // }, [isConnected, disconnectConversation]);

  /**
   * Sets up audio visualization using canvas
   * Renders frequency bars for both user and AI audio
   */
  useEffect(() => {
    let animationFrameId: number;
    let isLoaded = true;
    const wavRecorder = wavRecorderRef.current;
    const wavPlayer = wavPlayerRef.current;

    const handlePauseCall = async () => {
      const wavRecorder = wavRecorderRef.current;
      if (isPaused) {
        await wavRecorder.record((data) =>
          clientRef.current.appendInputAudio(data.mono)
        );
        setIsPaused(false);
      } else {
        await wavRecorder.pause();
        setIsPaused(true);
      }
    };

    const render = () => {
      if (!isLoaded) return;

      // Render user audio visualization
      if (clientCanvasRef.current) {
        const canvas = clientCanvasRef.current;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Initialize canvas dimensions if needed
          if (!canvas.width || !canvas.height) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const frequencies = wavRecorder.recording
            ? wavRecorder.getFrequencies("voice")
            : { values: new Float32Array([0]) };

          // Update user audio activity state
          const userActivity = frequencies.values.some((v) => v > 0.1);

          // If user is speaking, update the last activity timestamp
          if (userActivity && isConnected) {
            lastUserActivityRef.current = Date.now();
            // Also clear any countdown if user becomes active
            if (idleCountdown !== null) {
              setIdleCountdown(null);
            }
          }

          setAudioActivity((prev) => ({
            ...prev,
            userSpeaking: userActivity,
          }));

          WavRenderer.drawBars(
            canvas,
            ctx,
            frequencies.values,
            "#0099ff",
            10,
            0,
            8
          );
        }
      }

      // Render AI audio visualization
      if (serverCanvasRef.current) {
        const canvas = serverCanvasRef.current;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          if (!canvas.width || !canvas.height) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const frequencies = wavPlayer.analyser
            ? wavPlayer.getFrequencies("voice")
            : { values: new Float32Array([0]) };

          const aiActivity = frequencies.values.some((v) => v > 0.1);

          setAudioActivity((prev) => ({
            ...prev,
            aiSpeaking: aiActivity,
          }));

          WavRenderer.drawBars(
            canvas,
            ctx,
            frequencies.values,
            "#009900",
            10,
            0,
            8
          );
        }
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      isLoaded = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const resetState = () => {
    // setCurrentMessage('');
    setClaimData({});
    // setRealtimeEvents([]);
    setIsComplete(false);
    // setIsRecording(false);
    setAudioActivity({ userSpeaking: false, aiSpeaking: false });
  };

  const handleSubmit = async () => {
    if (submitStatus === "submitting") return;

    try {
      setSubmitStatus("submitting");
      // Mock API call to AssistNet
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate a mock claim ID
      const mockClaimId = `CLM${Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0")
        .replace(/(\d{3})(\d{2})(\d{3})/, "$1-$2-$3")}`;

      setClaimId(mockClaimId);
      setSubmitStatus("success");
      setShowSuccessModal(true);

      // close the conversation
      disconnectConversation();
    } catch (error) {
      console.error("Failed to submit claim:", error);

      setSubmitStatus("error");
    }
  };

  const handleSubmitClaim = async () => {
    try {
      setSubmitStatus("submitting");

      // Get the latest claim data from the ref and add draftClaimId
      const latestClaimData = {
        ...claimDataRef.current,
        draftClaimId,
      };

      const { claimNumber } = await createAndSubmitClaim(
        latestClaimData,
        vehicles,
        draftClaimId
      );

      setClaimId(claimNumber);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting claim:", error);
      setSubmitStatus("error");
    } finally {
      // setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    // Reset the form state
    setClaimData({});
    setIsPreview(false);
    setIsComplete(false);
    setSubmitStatus("success");
  };

  const handleVoiceClick = () => {
    if (isConnected) {
      disconnectConversation();
    } else {
      connectConversation();
    }
  };

  const handlePauseCall = async () => {
    const wavRecorder = wavRecorderRef.current;
    if (isPaused) {
      await wavRecorder.record((data) =>
        clientRef.current.appendInputAudio(data.mono)
      );
      setIsPaused(false);
    } else {
      await wavRecorder.pause();
      setIsPaused(true);
    }
  };

  const handleLossCauseChange = (lossCause: LossCauseType) => {
    setClaimData((prevData) => ({
      ...prevData,
      lossCause: {
        code: lossCause,
        name: getLossCauseName(lossCause),
      },
    }));
  };

  // Function to create draft claim
  const createDraftClaimIfNeeded = useCallback(
    async (incidentDate: string) => {
      if (!draftClaimId) {
        try {
          const draftClaim = await createDraftClaim({
            policyNumber: policyList[0]?.policyNumber || "",
            lossDate: new Date(incidentDate).toISOString(),
          });

          if (!draftClaim.id) {
            throw new Error("Failed to get claim ID from draft claim");
          }

          setDraftClaimId(draftClaim.id);
        } catch (error) {
          console.error("Error creating draft claim:", error);
          // Handle error appropriately
        }
      }
    },
    [draftClaimId, policyList]
  );

  useEffect(() => {
    if (claimData.incidentDate && !draftClaimId) {
      createDraftClaimIfNeeded(claimData.incidentDate);
    }
  }, [claimData.incidentDate, createDraftClaimIfNeeded, draftClaimId]);

  const renderLandingMode = () => (
    <div className={styles.textContent}>
      <p className={styles.greeting}>
        Hi Ray, I'm{" "}
        <span className={styles.highlight}>your AI claims agent.</span>
      </p>
      <h1>How can I help you today?</h1>
      <button className={styles.startButton} onClick={handleVoiceClick}>
        <img
          // src={microphone}
          src="images/microphone.svg"
          alt="Microphone"
          style={{
            verticalAlign: "middle",
            marginRight: "8px",
            display: "inline-block",
          }}
        />
        <span style={{ verticalAlign: "middle", display: "inline-block" }}>
          Start
        </span>
      </button>
    </div>
  );

  const renderConnectedMode = () => (
    <div className={styles.claimProgressCard}>
      <ClaimProgress
        claimData={claimData}
        onComplete={() => setIsComplete(true)}
        onStop={disconnectConversation}
      />
    </div>
  );

  const renderPreviewMode = () => (
    <div className={styles.claimSummaryContainer}>
      <ClaimSummary
        claimData={claimData}
        isComplete={isComplete}
        onSubmit={handleSubmitClaim}
        onCancel={disconnectConversation}
        submitStatus={submitStatus}
        onLossCauseChange={handleLossCauseChange}
      >
        <VoiceAvatar
          mode={
            audioActivity.aiSpeaking
              ? "speaking"
              : isConnected
              ? "listening"
              : "idle"
          }
          onClick={handleVoiceClick}
          size={50}
        />
      </ClaimSummary>
    </div>
  );

  const renderVoiceAvatar = (size: number, showStatus = false) => (
    <div
      className={cn(
        styles.avatarSection,
        isConnected && !isPreview && styles["avatarSection-connected"]
      )}
    >
      <VoiceAvatar
        mode={
          audioActivity.aiSpeaking
            ? "speaking"
            : isConnected
            ? "listening"
            : "idle"
        }
        onClick={handleVoiceClick}
        size={size}
        showStatusMessage={showStatus}
        isConnected={isConnected}
      />
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Idle countdown warning message */}
      {idleCountdown !== null && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: "#00739d",
            color: "#fff",
            padding: "10px",
            textAlign: "center",
            zIndex: 1000,
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          <p style={{ margin: 0, fontSize: "16px" }}>
            <span role="img" aria-label="warning">
              ⚠️
            </span>{" "}
            Call will disconnect in {idleCountdown} seconds due to inactivity
          </p>
        </div>
      )}
      <div className={styles.visualization} style={{ display: "none" }}>
        <div className={styles.visualizationEntry}>
          <canvas ref={clientCanvasRef} />
        </div>
        <div className={styles.visualizationEntry}>
          <canvas ref={serverCanvasRef} />
        </div>
      </div>

      {connectionError && (
        <div className={styles.errorMessage}>{connectionError}</div>
      )}
      {showSuccessModal ? (
        <SuccessModal claimId={claimId} onClose={handleCloseModal} />
      ) : (
        <React.Fragment>
          {!isPreview && (
            <div className={styles.mainContent}>
              {renderVoiceAvatar(!isConnected ? 280 : 250, isConnected)}
              {!isConnected ? renderLandingMode() : renderConnectedMode()}
            </div>
          )}
          {isPreview && renderPreviewMode()}
        </React.Fragment>
      )}
    </div>
  );
};

export default FileClaim;
