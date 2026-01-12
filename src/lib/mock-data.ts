// Mock data for UI demonstration

export const tournaments = [
  {
    id: "1",
    title: "第15回 マスターデュエル交流戦",
    description: "初心者〜中級者向けの交流大会です。気軽にご参加ください！",
    format: "シングルエリミネーション",
    matchFormat: "マッチ戦（2本先取）",
    status: "recruiting" as const,
    participants: 24,
    maxParticipants: 32,
    startDate: "2025-02-01T14:00:00",
    entryDeadline: "2025-01-31T23:59:59",
    organizer: "MDコミュニティ",
  },
  {
    id: "2",
    title: "Weekly Tournament #42",
    description: "毎週開催の定期大会。上位者にはポイント付与！",
    format: "スイスドロー",
    matchFormat: "シングル戦（1本勝負）",
    status: "in_progress" as const,
    participants: 16,
    maxParticipants: 16,
    startDate: "2025-01-25T20:00:00",
    entryDeadline: "2025-01-25T19:30:00",
    organizer: "Weekly MD",
  },
  {
    id: "3",
    title: "Championship Series 2025",
    description: "年間チャンピオンを決める大規模トーナメント",
    format: "ダブルエリミネーション",
    matchFormat: "マッチ戦（2本先取）",
    status: "completed" as const,
    participants: 64,
    maxParticipants: 64,
    startDate: "2025-01-20T13:00:00",
    entryDeadline: "2025-01-19T23:59:59",
    organizer: "MD Championship",
  },
];

export const matches = [
  {
    id: "1",
    round: 1,
    matchNumber: 1,
    player1: { name: "Player A", score: 2 },
    player2: { name: "Player B", score: 1 },
    status: "completed" as const,
    winner: "player1" as const,
  },
  {
    id: "2",
    round: 1,
    matchNumber: 2,
    player1: { name: "Player C", score: 2 },
    player2: { name: "Player D", score: 0 },
    status: "completed" as const,
    winner: "player1" as const,
  },
  {
    id: "3",
    round: 1,
    matchNumber: 3,
    player1: { name: "Player E", score: 0 },
    player2: { name: "Player F", score: null },
    status: "in_progress" as const,
    winner: null,
  },
  {
    id: "4",
    round: 1,
    matchNumber: 4,
    player1: { name: "Player G", score: null },
    player2: { name: "Player H", score: null },
    status: "pending" as const,
    winner: null,
  },
  {
    id: "5",
    round: 2,
    matchNumber: 1,
    player1: { name: "Player A", score: null },
    player2: { name: "Player C", score: null },
    status: "pending" as const,
    winner: null,
  },
  {
    id: "6",
    round: 2,
    matchNumber: 2,
    player1: { name: "TBD", score: null },
    player2: { name: "TBD", score: null },
    status: "pending" as const,
    winner: null,
  },
];

export const statusLabels = {
  recruiting: "エントリー受付中",
  in_progress: "開催中",
  completed: "終了",
  pending: "待機中",
};

export const statusColors = {
  recruiting: "bg-green-500",
  in_progress: "bg-blue-500",
  completed: "bg-gray-500",
  pending: "bg-yellow-500",
};
