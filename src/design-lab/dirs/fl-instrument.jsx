/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { screens as base, Preview as Base } from './fieldlab.jsx'
import './fl-instrument.css'

// Field Lab · Instrument — cooler and more mechanical. The grid is a dot
// matrix, like the face of a measuring instrument, and gauges lead.
export const meta = {
  id: 'fl-instrument', family: 'fieldlab', lockup: 'fieldlab', name: 'Instrument', defaultMode: 'light',
  tagline: 'Field Lab as a precision instrument',
  signature: 'A dot-matrix grid and engraved, instrument-panel gauges',
  research: 'Pushes the tinkerer side: a cool stone surface, a grid reduced to fine dots at each intersection, engraved hairlines, and the sighting-reticle lockup. Heat stays in the gauges and the mark.',
}
export const screens = base
export const Preview = () => <Base kind="fieldlab" />
