'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Save, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'

type Team = { id: string; name: string; avatar_url: string | null }
type Block = { id: string; block_name: string; block_order: number }

type Props = {
  seriesId: string
  teams: Team[]
  blocks: Block[]
  /** team_id -> block_id の初期マッピング */
  teamBlockMap: Record<string, string | null>
  /** 最初のtournament_id（team_entriesのblock_id更新用） */
  tournamentIds: string[]
}

export function BlockAssignment({ seriesId, teams, blocks: initialBlocks, teamBlockMap: initialMap, tournamentIds }: Props) {
  const t = useTranslations('series.blocks')
  const supabase = createClient()
  const [blocks, setBlocks] = useState(initialBlocks)
  const [assignments, setAssignments] = useState<Record<string, string | null>>(initialMap)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newBlockName, setNewBlockName] = useState('')

  const handleAddBlock = async () => {
    const name = newBlockName.trim()
    if (!name) return

    const nextOrder = blocks.length + 1
    // tournament_blocksはtournament_idが必要なので最初の大会に紐づける
    const tid = tournamentIds[0]
    if (!tid) return

    const { data, error } = await supabase
      .from('tournament_blocks')
      .insert({ tournament_id: tid, series_id: seriesId, block_name: name, block_order: nextOrder })
      .select()
      .single()

    if (!error && data) {
      setBlocks(prev => [...prev, { id: data.id, block_name: data.block_name, block_order: data.block_order }])
      setNewBlockName('')
    }
  }

  const handleDeleteBlock = async (blockId: string) => {
    // ブロックに所属するチームがいないか確認
    const hasTeams = Object.values(assignments).some(bid => bid === blockId)
    if (hasTeams) {
      alert(t('moveFirst'))
      return
    }

    const { error } = await supabase
      .from('tournament_blocks')
      .delete()
      .eq('id', blockId)

    if (!error) {
      setBlocks(prev => prev.filter(b => b.id !== blockId))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    // team_entriesのblock_idを一括更新
    for (const [teamId, blockId] of Object.entries(assignments)) {
      for (const tid of tournamentIds) {
        await supabase
          .from('team_entries')
          .update({ block_id: blockId })
          .eq('tournament_id', tid)
          .eq('team_id', teamId)
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ブロック別にチームをグループ化
  const unassigned = teams.filter(t => !assignments[t.id])
  const blockGroups = blocks.map(block => ({
    block,
    teams: teams.filter(t => assignments[t.id] === block.id),
  }))

  return (
    <div className="space-y-4">
      {/* ブロック管理 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {blocks.map(block => (
              <div key={block.id} className="flex items-center gap-1.5 border rounded-md px-3 py-1.5">
                <span className="text-sm font-medium">{block.block_name}</span>
                <Badge variant="secondary" className="text-xs">
                  {teams.filter(t => assignments[t.id] === block.id).length}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(block.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newBlockName}
              onChange={e => setNewBlockName(e.target.value)}
              placeholder={t('newBlockPlaceholder')}
              className="max-w-[200px]"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddBlock())}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddBlock} disabled={!newBlockName.trim()}>
              <Plus className="h-4 w-4 mr-1" />{t('add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 未割り当てチーム */}
      {unassigned.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {t('unassigned')}
              <Badge variant="destructive" className="text-xs">{unassigned.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassigned.map(team => (
                <div key={team.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {team.avatar_url && <AvatarImage src={team.avatar_url} alt="" />}
                      <AvatarFallback className="text-xs">{team.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{team.name}</span>
                  </div>
                  <select
                    className="text-sm border rounded-md px-2 py-1"
                    value=""
                    onChange={e => setAssignments(prev => ({ ...prev, [team.id]: e.target.value || null }))}
                  >
                    <option value="">{t('selectPlaceholder')}</option>
                    {blocks.map(b => (
                      <option key={b.id} value={b.id}>{b.block_name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ブロック別チーム一覧 */}
      {blockGroups.map(({ block, teams: blockTeams }) => (
        <Card key={block.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {block.block_name}
              <Badge variant="secondary" className="text-xs">{blockTeams.length} {t('teams')}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blockTeams.length > 0 ? (
              <div className="space-y-2">
                {blockTeams.map(team => (
                  <div key={team.id} className="flex items-center justify-between gap-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {team.avatar_url && <AvatarImage src={team.avatar_url} alt="" />}
                        <AvatarFallback className="text-xs">{team.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{team.name}</span>
                    </div>
                    <select
                      className="text-sm border rounded-md px-2 py-1"
                      value={block.id}
                      onChange={e => setAssignments(prev => ({ ...prev, [team.id]: e.target.value || null }))}
                    >
                      <option value="">{t('unassigned')}</option>
                      {blocks.map(b => (
                        <option key={b.id} value={b.id}>{b.block_name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">{t('noTeams')}</p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* 保存ボタン */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? t('saving') : t('save')}
        </Button>
        {saved && <span className="text-sm text-green-600">{t('saved')}</span>}
      </div>
    </div>
  )
}
