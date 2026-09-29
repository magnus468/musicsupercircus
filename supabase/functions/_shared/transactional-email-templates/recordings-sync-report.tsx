import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  inserted?: number
  updated?: number
  totalRows?: number
  syncedAt?: string
  added?: { title?: string; isrc?: string; project?: string | null }[]
  changed?: { title?: string; diffs?: { field?: string; from?: string; to?: string }[] }[]
}

const Email = ({ inserted = 0, updated = 0, totalRows = 0, syncedAt, added = [], changed = [] }: Props) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>{`${inserted} nya och ${updated} uppdaterade inspelningar`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Daglig rapport: Inspelningsrättigheter</Heading>
        <Text style={muted}>{syncedAt ?? ''}</Text>
        <Section style={statBox}>
          <Text style={stat}><strong>{inserted}</strong> nya inspelningar · <strong>{updated}</strong> uppdaterade</Text>
          <Text style={muted}>{totalRows} rader lästa från ISRC-listan</Text>
        </Section>
        <Hr style={hr} />
        <Heading as="h2" style={h2}>Nya inspelningar</Heading>
        {added.length === 0 ? <Text style={muted}>Inga nya inspelningar idag.</Text> : added.map((w, i) => (
          <Section key={i} style={row}>
            <Text style={title}>{w.title ?? 'Utan titel'}</Text>
            <Text style={muted}>{[w.isrc, w.project].filter(Boolean).join(' · ')}</Text>
          </Section>
        ))}
        <Hr style={hr} />
        <Heading as="h2" style={h2}>Uppdaterade inspelningar</Heading>
        {changed.length === 0 ? <Text style={muted}>Inga ändringar idag.</Text> : changed.map((w, i) => (
          <Section key={`c${i}`} style={row}>
            <Text style={title}>{w.title ?? 'Utan titel'}</Text>
            {(w.diffs ?? []).map((d, j) => (
              <Section key={j} style={diff}>
                <Text style={field}>{d.field}</Text>
                <Text style={from}>Från: {d.from}</Text>
                <Text style={to}>Till: {d.to}</Text>
              </Section>
            ))}
          </Section>
        ))}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Inspelningar: ${d?.inserted ?? 0} nya, ${d?.updated ?? 0} uppdaterade`,
  displayName: 'Inspelningssynk-rapport',
  to: 'magnus@musicsupercircus.com',
  previewData: {
    inserted: 1, updated: 1, totalRows: 1695, syncedAt: '2026-09-30 06:00',
    added: [{ title: 'Start credit', isrc: 'SE2EI1100301', project: 'Jägarna 2' }],
    changed: [{ title: 'Erik remembers', diffs: [{ field: 'Reggat i IFPI', from: 'NEJ', to: 'JA' }] }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '620px' }
const h1 = { fontSize: '22px', color: '#1a1a1a', margin: '0 0 4px' }
const h2 = { fontSize: '16px', color: '#1a1a1a', margin: '16px 0 8px' }
const muted = { fontSize: '13px', color: '#6b7280', margin: '2px 0' }
const statBox = { backgroundColor: '#fdf3ee', borderLeft: '4px solid #c75a1f', padding: '12px 16px', margin: '16px 0' }
const stat = { fontSize: '16px', color: '#1a1a1a', margin: '0 0 4px' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const row = { padding: '6px 0', borderBottom: '1px solid #f0f0f0' }
const title = { fontSize: '14px', color: '#1a1a1a', margin: '0', fontWeight: 600 }
const diff = { padding: '4px 0 4px 10px', borderLeft: '2px solid #e5e7eb', margin: '4px 0' }
const field = { fontSize: '13px', color: '#1a1a1a', margin: '0', fontWeight: 600 }
const from = { fontSize: '13px', color: '#b91c1c', margin: '1px 0' }
const to = { fontSize: '13px', color: '#15803d', margin: '1px 0' }
