import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AddedWork {
  title?: string
  project?: string | null
  creators?: string | null
}

interface Props {
  inserted?: number
  skipped?: number
  totalRows?: number
  syncedAt?: string
  works?: AddedWork[]
}

const Email = ({ inserted = 0, skipped = 0, totalRows = 0, syncedAt, works = [] }: Props) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>{`${inserted} nya verk tillagda i katalogen`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Verksynk klar</Heading>
        <Text style={muted}>{syncedAt ?? ''}</Text>
        <Section style={statBox}>
          <Text style={stat}>
            <strong>{inserted}</strong> nya verk tillagda
          </Text>
          <Text style={muted}>
            {totalRows} rader lästa · {skipped} hoppades över (fanns redan)
          </Text>
        </Section>
        <Hr style={hr} />
        <Heading as="h2" style={h2}>
          Tillagda verk
        </Heading>
        {works.length === 0 ? (
          <Text style={muted}>Inga nya verk denna gång.</Text>
        ) : (
          works.map((w, i) => (
            <Section key={i} style={rowStyle}>
              <Text style={titleStyle}>{w.title ?? 'Utan titel'}</Text>
              <Text style={muted}>
                {[w.project, w.creators].filter(Boolean).join(' · ') || '—'}
              </Text>
            </Section>
          ))
        )}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Verksynk: ${data?.inserted ?? 0} nya verk i katalogen`,
  displayName: 'Verksynk-rapport',
  to: 'magnus@musicsupercircus.com',
  previewData: {
    inserted: 2,
    skipped: 1004,
    totalRows: 1620,
    syncedAt: '2026-08-26 20:45',
    works: [
      { title: 'Sommarnatt', project: 'Trion', creators: 'A. Andersson' },
      { title: 'Vinterljus', project: 'Sagan', creators: 'B. Berg' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '620px' }
const h1 = { fontSize: '22px', color: '#1a1a1a', margin: '0 0 4px' }
const h2 = { fontSize: '16px', color: '#1a1a1a', margin: '16px 0 8px' }
const muted = { fontSize: '13px', color: '#6b7280', margin: '2px 0' }
const statBox = {
  backgroundColor: '#fdf3ee',
  borderLeft: '4px solid #c75a1f',
  padding: '12px 16px',
  margin: '16px 0',
}
const stat = { fontSize: '16px', color: '#1a1a1a', margin: '0 0 4px' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const rowStyle = { padding: '6px 0', borderBottom: '1px solid #f0f0f0' }
const titleStyle = { fontSize: '14px', color: '#1a1a1a', margin: '0', fontWeight: 600 }
