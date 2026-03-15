"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { startSession, StartSessionResult } from "@/app/lib/api";
import {
    Room,
    RoomEvent,
    ConnectionState,
    Track,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    ParticipantEvent,
} from "livekit-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const LIVEKIT_URL =
    process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://localhost:7880";

type Screen = "entry" | "connecting" | "active" | "completed";

export default function ExamSession() {
    const params = useParams();
    const examId = params?.id as string;

    const [screen, setScreen] = useState<Screen>("entry");
    const [studentName, setStudentName] = useState("");
    const [examTitle, setExamTitle] = useState("Аудіо-тест");
    const [examSubject, setExamSubject] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // LiveKit state
    const [agentSpeaking, setAgentSpeaking] = useState(false);
    const [micActive, setMicActive] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState>(
        ConnectionState.Disconnected
    );

    const roomRef = useRef<Room | null>(null);
    const sessionRef = useRef<StartSessionResult | null>(null);

    // Load exam title from backend (fallback to generic)
    useEffect(() => {
        if (!examId) return;
        fetch(`${API_URL}/exams/${examId}/public`)
            .then((r) => r.json())
            .then((data) => {
                if (data?.title) setExamTitle(data.title);
                if (data?.subject) setExamSubject(data.subject);
            })
            .catch(() => {
                // No public endpoint — title will show after session starts
            });
    }, [examId]);

    const handleStart = async () => {
        if (!studentName.trim()) return;
        setError("");
        setLoading(true);
        setScreen("connecting");

        try {
            const result = await startSession(examId, studentName.trim());
            sessionRef.current = result;
            setExamTitle(result.room_name.replace("exam-", "") || examTitle);
            await connectToRoom(result.token, result.room_name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Помилка з'єднання");
            setScreen("entry");
        } finally {
            setLoading(false);
        }
    };

    const connectToRoom = useCallback(async (token: string, roomName: string) => {
        const room = new Room({
            adaptiveStream: true,
            dynacast: true,
        });
        roomRef.current = room;

        // Track connection state
        room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
            setConnectionState(state);
            if (state === ConnectionState.Connected) {
                setScreen("active");
                setMicActive(true);
            }
        });

        // Attach remote audio tracks and detect speaking
        room.on(
            RoomEvent.TrackSubscribed,
            (
                track: RemoteTrack,
                publication: RemoteTrackPublication,
                participant: RemoteParticipant
            ) => {
                if (track.kind === Track.Kind.Audio) {
                    const el = track.attach();
                    el.id = `audio-${participant.identity}`;
                    document.body.appendChild(el);

                    participant.on(ParticipantEvent.IsSpeakingChanged, (speaking: boolean) => {
                        setAgentSpeaking(speaking);
                    });
                }
            }
        );

        room.on(
            RoomEvent.TrackUnsubscribed,
            (track: RemoteTrack) => {
                track.detach().forEach((el) => el.remove());
            }
        );

        // Session completed — agent disconnects or sends data
        room.on(RoomEvent.ParticipantDisconnected, () => {
            // Agent left — exam is done
            setTimeout(() => {
                setScreen("completed");
                setMicActive(false);
                room.disconnect();
            }, 1500);
        });

        room.on(RoomEvent.Disconnected, () => {
            setMicActive(false);
        });

        await room.connect(LIVEKIT_URL, token);
        await room.startAudio();
        await room.localParticipant.setMicrophoneEnabled(true);

        void roomName;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            roomRef.current?.disconnect();
        };
    }, []);

    // ── Entry Screen ──────────────────────────────────────────────
    if (screen === "entry") {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <Image
                            src="/image.png"
                            alt="Звірчик"
                            width={40}
                            height={40}
                            className="rounded-xl"
                        />
                        <h1 className="text-2xl font-bold text-blue-400">Звірчик</h1>
                    </div>

                    {/* Exam info */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-indigo-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-lg leading-tight">
                                    {examTitle}
                                </h2>
                                {examSubject && (
                                    <p className="text-gray-400 text-sm">{examSubject}</p>
                                )}
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                            Аудіо-тест. ШІ-екзаменатор поставить питання голосом.
                            Відповідайте усно — мікрофон активується автоматично.
                        </p>

                        {/* Name input */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Ваше ім'я та прізвище
                            </label>
                            <input
                                type="text"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                                placeholder="Іванов Микола"
                                autoFocus
                                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg mb-4">
                                {error}
                            </p>
                        )}

                        <button
                            onClick={handleStart}
                            disabled={!studentName.trim() || loading}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                                />
                            </svg>
                            Розпочати аудіо-тест
                        </button>
                    </div>

                    <p className="text-center text-xs text-gray-600">
                        Дозвольте доступ до мікрофона коли браузер запитає
                    </p>
                </div>
            </div>
        );
    }

    // ── Connecting Screen ─────────────────────────────────────────
    if (screen === "connecting") {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-white font-medium">З'єднання з екзаменатором...</p>
                    <p className="text-gray-500 text-sm mt-1">
                        {connectionState === ConnectionState.Connecting
                            ? "Підключення до кімнати"
                            : "Підготовка сесії"}
                    </p>
                </div>
            </div>
        );
    }

    // ── Active Session Screen ─────────────────────────────────────
    if (screen === "active") {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 gap-8">
                {/* Header */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Image src="/image.png" alt="Звірчик" width={28} height={28} className="rounded-lg" />
                        <span className="text-blue-400 font-semibold">Звірчик</span>
                    </div>
                    <h2 className="text-white text-lg font-semibold">{examTitle}</h2>
                    {examSubject && <p className="text-gray-500 text-sm">{examSubject}</p>}
                </div>

                {/* AI Status */}
                <div className="flex flex-col items-center gap-3">
                    {/* Waveform / speaking indicator */}
                    <div
                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${agentSpeaking
                            ? "bg-blue-500/20 ring-4 ring-blue-500/40 scale-110"
                            : "bg-gray-800"
                            }`}
                    >
                        <svg
                            className={`w-10 h-10 transition-colors duration-300 ${agentSpeaking ? "text-blue-400" : "text-gray-600"
                                }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                            />
                        </svg>
                    </div>

                    <p className="text-sm font-medium text-center">
                        {agentSpeaking ? (
                            <span className="text-blue-400">🤖 Екзаменатор говорить...</span>
                        ) : (
                            <span className="text-gray-400">Очікування питання</span>
                        )}
                    </p>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-800" />

                {/* Mic indicator */}
                <div className="flex flex-col items-center gap-3">
                    <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${micActive
                            ? "bg-green-500/20 ring-4 ring-green-500/40"
                            : "bg-gray-800"
                            }`}
                    >
                        <svg
                            className={`w-9 h-9 transition-colors duration-300 ${micActive ? "text-green-400" : "text-gray-600"
                                }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm text-center">
                        {micActive ? (
                            <span className="text-green-400 font-medium">
                                🎙️ Мікрофон активний — говоріть вашу відповідь
                            </span>
                        ) : (
                            <span className="text-gray-500">Мікрофон вимкнено</span>
                        )}
                    </p>
                </div>

                {/* Bottom hint */}
                <p className="text-xs text-gray-700 text-center max-w-xs">
                    Слухайте питання та відповідайте голосом.
                    <br />
                    Текстовий ввід недоступний — тільки мова.
                </p>
            </div>
        );
    }

    // ── Completed Screen ──────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
            <div className="text-center max-w-sm">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg
                        className="w-10 h-10 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Тест завершено!</h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                    Дякуємо, {studentName}! Ваші відповіді записані та надіслані вчителю.
                    Результати з'являться у кабінеті вчителя.
                </p>

                <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 inline-block">
                    <p className="text-gray-500 text-sm">{examTitle}</p>
                </div>

                <p className="text-xs text-gray-700 mt-6">
                    Це вікно можна закрити
                </p>
            </div>
        </div>
    );
}
