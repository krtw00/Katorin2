"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  tournaments,
  matches,
  statusLabels,
} from "@/lib/mock-data";
import Link from "next/link";

function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    recruiting: "default",
    in_progress: "secondary",
    completed: "outline",
    pending: "destructive",
  };
  return <Badge variant={variants[status]}>{statusLabels[status]}</Badge>;
}

function MatchStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "outline",
    in_progress: "default",
    pending: "secondary",
  };
  const labels: Record<string, string> = {
    completed: "終了",
    in_progress: "対戦中",
    pending: "待機中",
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

export default function ShadcnMockPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Katorin</h1>
            <nav className="hidden md:flex gap-4">
              <Link href="#" className="text-sm font-medium hover:text-primary">
                大会一覧
              </Link>
              <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-primary">
                マイページ
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              ログイン
            </Button>
            <Button size="sm">新規登録</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">大会一覧</TabsTrigger>
            <TabsTrigger value="detail">大会詳細</TabsTrigger>
            <TabsTrigger value="bracket">トーナメント表</TabsTrigger>
          </TabsList>

          {/* 大会一覧 */}
          <TabsContent value="list" className="space-y-6">
            <div className="flex gap-4">
              <Input placeholder="大会を検索..." className="max-w-sm" />
              <Button>検索</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <Card key={tournament.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{tournament.title}</CardTitle>
                      <StatusBadge status={tournament.status} />
                    </div>
                    <CardDescription>{tournament.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">形式</span>
                      <span>{tournament.format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">対戦</span>
                      <span>{tournament.matchFormat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">参加者</span>
                      <span>
                        {tournament.participants} / {tournament.maxParticipants}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">主催</span>
                      <span>{tournament.organizer}</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">
                      {tournament.status === "recruiting" ? "エントリーする" : "詳細を見る"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 大会詳細 */}
          <TabsContent value="detail" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">第15回 マスターデュエル交流戦</CardTitle>
                    <CardDescription className="mt-2">
                      初心者〜中級者向けの交流大会です。気軽にご参加ください！
                    </CardDescription>
                  </div>
                  <StatusBadge status="recruiting" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="font-semibold">大会情報</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">トーナメント形式</span>
                        <span>シングルエリミネーション</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">対戦形式</span>
                        <span>マッチ戦（2本先取）</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">開催日時</span>
                        <span>2025年2月1日 14:00</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">エントリー締切</span>
                        <span>2025年1月31日 23:59</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">参加者数</span>
                        <span>24 / 32</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">主催者</h3>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>MD</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">MDコミュニティ</p>
                        <p className="text-sm text-muted-foreground">開催実績: 15回</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button className="flex-1">エントリーする</Button>
                <Button variant="outline">共有</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* トーナメント表 */}
          <TabsContent value="bracket" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>トーナメント表</CardTitle>
                <CardDescription>第15回 マスターデュエル交流戦</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">ラウンド</TableHead>
                      <TableHead>プレイヤー1</TableHead>
                      <TableHead className="w-20 text-center">スコア</TableHead>
                      <TableHead>プレイヤー2</TableHead>
                      <TableHead className="w-24">ステータス</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>R{match.round}-{match.matchNumber}</TableCell>
                        <TableCell className={match.winner === "player1" ? "font-bold" : ""}>
                          {match.player1.name}
                        </TableCell>
                        <TableCell className="text-center">
                          {match.player1.score ?? "-"} - {match.player2.score ?? "-"}
                        </TableCell>
                        <TableCell className={match.winner === "player2" ? "font-bold" : ""}>
                          {match.player2.name}
                        </TableCell>
                        <TableCell>
                          <MatchStatusBadge status={match.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>shadcn/ui Mock - Katorin Tournament System</p>
        </div>
      </footer>
    </div>
  );
}
