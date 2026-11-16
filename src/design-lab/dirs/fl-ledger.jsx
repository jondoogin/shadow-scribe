/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { screens as base, Preview as Base } from './fieldlab.jsx'
import './fl-ledger.css'

// Field Lab · Ledger — the quietest one. No boxes, almost all typography.
// The grid survives only as a ruler down the left margin of every screen.
export const meta = {
  id: 'fl-ledger', family: 'fieldlab', lockup: 'ledger', name: 'Ledger', defaultMode: 'light',
  tagline: 'Field Lab with almost nothing on the page but type',
  signature: 'The grid becomes a measuring ruler down the left margin',
  research: 'Strips Field Lab back to a lab ledger: no cards, hairline rules, one ember accent and generous space. The graph paper is reduced to a ruler running down the page edge, so the precision is still felt without lines behind the text.',
}
export const screens = base
export const Preview = () => <Base kind="ledger" />
