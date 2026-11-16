/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { screens as base, Preview as Base } from './fieldlab.jsx'
import './fl-lamplight.css'

// Field Lab · Lamplight — the grid is only visible where the lantern's
// light falls: a pool at the top of the screen that fades to plain paper.
export const meta = {
  id: 'fl-lamplight', family: 'fieldlab', lockup: 'lamplight', name: 'Lamplight', defaultMode: 'dark',
  tagline: 'Field Lab at night, by the light of the lantern',
  signature: 'Graph paper that only shows where the lamp is shining',
  research: 'The warmest of the three. The grid appears only inside a pool of light under the logo, as if the page were lit by the lantern itself, with hard grid lines rather than a blurred glow. The heat palette comes straight from the four-square mark.',
}
export const screens = base
export const Preview = () => <Base kind="lamplight" />
